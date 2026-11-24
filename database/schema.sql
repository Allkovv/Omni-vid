-- OMNI: база данных для импорта и анализа оценок, PostgreSQL 14+
-- Запуск: создать БД omni_grades (в pgAdmin или CREATE DATABASE omni_grades;),
-- подключиться к ней, затем выполнить этот файл целиком.
-- Скрипт не удаляет существующие таблицы.

BEGIN;

CREATE TABLE IF NOT EXISTS app_users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('teacher','admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_groups (
    group_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_name VARCHAR(80) NOT NULL UNIQUE,
    admission_year SMALLINT CHECK (admission_year BETWEEN 2000 AND 2100)
);

CREATE TABLE IF NOT EXISTS students (
    student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES study_groups(group_id) ON DELETE RESTRICT,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    external_student_id VARCHAR(100) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subjects (
    subject_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_name VARCHAR(300) NOT NULL UNIQUE,
    study_hours INTEGER NOT NULL DEFAULT 0 CHECK (study_hours >= 0)
);

CREATE TABLE IF NOT EXISTS academic_periods (
    period_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_year VARCHAR(9) NOT NULL CHECK (academic_year ~ '^[0-9]{4}/[0-9]{4}$'),
    semester SMALLINT NOT NULL CHECK (semester IN (1,2)),
    UNIQUE (academic_year, semester)
);

-- Дисциплины, назначенные учебной группе в конкретном периоде.
CREATE TABLE IF NOT EXISTS group_subjects (
    group_id BIGINT NOT NULL REFERENCES study_groups(group_id) ON DELETE CASCADE,
    subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE RESTRICT,
    period_id BIGINT NOT NULL REFERENCES academic_periods(period_id) ON DELETE RESTRICT,
    PRIMARY KEY (group_id, subject_id, period_id)
);

-- Права преподавателя на конкретную дисциплину в группе.
CREATE TABLE IF NOT EXISTS teacher_access (
    user_id BIGINT NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    period_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, group_id, subject_id, period_id),
    FOREIGN KEY (group_id, subject_id, period_id)
      REFERENCES group_subjects(group_id, subject_id, period_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_batches (
    import_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uploaded_by BIGINT NOT NULL REFERENCES app_users(user_id) ON DELETE RESTRICT,
    group_id BIGINT NOT NULL REFERENCES study_groups(group_id) ON DELETE RESTRICT,
    period_id BIGINT NOT NULL REFERENCES academic_periods(period_id) ON DELETE RESTRICT,
    source_filename VARCHAR(255) NOT NULL,
    source_sha256 CHAR(64),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    import_status VARCHAR(20) NOT NULL DEFAULT 'processing'
        CHECK (import_status IN ('processing','completed','failed')),
    imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
    skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
    error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    error_details TEXT
);

-- Одна итоговая оценка/результат по студенту, дисциплине и периоду.
-- NULL в обоих значениях означает 'результат отсутствует', а не двойку.
CREATE TABLE IF NOT EXISTS grades (
    grade_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
    subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE RESTRICT,
    period_id BIGINT NOT NULL REFERENCES academic_periods(period_id) ON DELETE RESTRICT,
    numeric_grade SMALLINT CHECK (numeric_grade BETWEEN 2 AND 5),
    text_grade VARCHAR(50) CHECK (text_grade IN ('зачтено','не зачтено')),
    import_id BIGINT REFERENCES import_batches(import_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT only_one_grade_kind CHECK (numeric_grade IS NULL OR text_grade IS NULL),
    CONSTRAINT unique_student_subject_period UNIQUE (student_id, subject_id, period_id)
);

-- Журнал изменения результатов; значения фиксирует серверное приложение
-- в той же транзакции, что и UPDATE grades.
CREATE TABLE IF NOT EXISTS grade_changes (
    change_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grade_id BIGINT NOT NULL REFERENCES grades(grade_id) ON DELETE RESTRICT,
    changed_by BIGINT NOT NULL REFERENCES app_users(user_id) ON DELETE RESTRICT,
    old_numeric_grade SMALLINT CHECK (old_numeric_grade BETWEEN 2 AND 5),
    new_numeric_grade SMALLINT CHECK (new_numeric_grade BETWEEN 2 AND 5),
    old_text_grade VARCHAR(50),
    new_text_grade VARCHAR(50),
    change_reason TEXT NOT NULL CHECK (length(btrim(change_reason)) > 0),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_last_name ON students (lower(last_name));
CREATE INDEX IF NOT EXISTS idx_students_group ON students (group_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_period ON grades (subject_id, period_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades (student_id);
CREATE INDEX IF NOT EXISTS idx_imports_group_period ON import_batches (group_id, period_id);
CREATE INDEX IF NOT EXISTS idx_changes_grade_time ON grade_changes (grade_id, changed_at DESC);

-- Просмотр результатов с ФИО, группой и дисциплиной.
CREATE OR REPLACE VIEW v_grade_details AS
SELECT g.grade_id, st.student_id,
       st.last_name, st.first_name, st.middle_name,
       sg.group_id, sg.group_name,
       su.subject_id, su.subject_name, su.study_hours,
       ap.period_id, ap.academic_year, ap.semester,
       g.numeric_grade, g.text_grade,
       CASE WHEN g.numeric_grade IS NULL AND g.text_grade IS NULL
            THEN 'отсутствует' ELSE 'выставлен' END AS result_status,
       g.import_id, g.updated_at
FROM grades g
JOIN students st ON st.student_id = g.student_id
JOIN study_groups sg ON sg.group_id = st.group_id
JOIN subjects su ON su.subject_id = g.subject_id
JOIN academic_periods ap ON ap.period_id = g.period_id;

-- Средний балл группы по дисциплине и учебному периоду.
CREATE OR REPLACE VIEW v_group_averages AS
SELECT group_id, group_name, subject_id, subject_name,
       period_id, academic_year, semester,
       MAX(study_hours) AS study_hours,
       ROUND(AVG(numeric_grade::NUMERIC), 2) AS average_grade,
       COUNT(numeric_grade) AS numeric_grades_count,
       COUNT(*) FILTER (WHERE numeric_grade IS NULL AND text_grade IS NULL) AS missing_count,
       COUNT(*) FILTER (WHERE numeric_grade = 2) AS failing_count
FROM v_grade_details
GROUP BY group_id, group_name, subject_id, subject_name,
         period_id, academic_year, semester;

COMMIT;

-- ПРИМЕРЫ ЗАПРОСОВ. Можно выполнять отдельно после импорта данных.
-- Поиск фамилии или её части (пример: 'иван'):
-- SELECT * FROM v_grade_details WHERE last_name ILIKE '%иван%';
-- Оценки одной группы:
-- SELECT * FROM v_grade_details WHERE group_name = 'ИСП-23-1';
-- Неудовлетворительные оценки:
-- SELECT * FROM v_grade_details WHERE numeric_grade = 2;
-- Средний балл по группам:
-- SELECT * FROM v_group_averages ORDER BY group_name, subject_name;
-- Результаты, отсутствующие в имеющихся строках grades:
-- SELECT * FROM v_grade_details WHERE result_status = 'отсутствует';
-- ВАЖНО: для выявления вообще не созданных строк следует сопоставлять
-- students x group_subjects через LEFT JOIN grades.
