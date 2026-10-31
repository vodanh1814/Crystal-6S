-- OPTIONAL sample data: 16 areas from the checklist file + NA matrix.
-- Admin can rename areas / create new ones in the app instead of running this file.
INSERT OR IGNORE INTO areas (code, name, sort_order) VALUES
('KNI', 'KNI', 10), ('GQC', 'GQC', 20), ('WH', 'WH', 30), ('BAT', 'BAT', 40),
('DYE', 'DYE', 50), ('L-DIP', 'L-DIP', 60), ('UNT', 'UNT', 70), ('SET', 'SET', 80),
('VAP', 'VAP', 90), ('FQC', 'FQC', 100), ('L-TES', 'L-TES', 110), ('MTN', 'MTN', 120),
('UTI', 'UTI', 130), ('TSC', 'TSC', 140), ('ADM', 'ADM', 150), ('FM/CFD', 'FM/CFD', 160);

-- S2.6 NA: WH, SET, VAP, FQC, L-TES, MTN
INSERT OR IGNORE INTO area_item_na (area_id, item_id)
SELECT a.id, i.id FROM areas a, checklist_items i
WHERE i.code = 'S2.6' AND a.code IN ('WH', 'SET', 'VAP', 'FQC', 'L-TES', 'MTN');

-- S2.7 NA: WH, L-DIP, L-TES, MTN, UTI, TSC
INSERT OR IGNORE INTO area_item_na (area_id, item_id)
SELECT a.id, i.id FROM areas a, checklist_items i
WHERE i.code = 'S2.7' AND a.code IN ('WH', 'L-DIP', 'L-TES', 'MTN', 'UTI', 'TSC');

-- S3.9 NA: all except KNI, GQC, ADM, FM/CFD
INSERT OR IGNORE INTO area_item_na (area_id, item_id)
SELECT a.id, i.id FROM areas a, checklist_items i
WHERE i.code = 'S3.9' AND a.code IN ('WH', 'BAT', 'DYE', 'L-DIP', 'UNT', 'SET', 'VAP', 'FQC', 'L-TES', 'MTN', 'UTI', 'TSC');
