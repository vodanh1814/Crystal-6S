import fs from 'fs';

// 15 Areas in order of the columns in the Excel image:
// 1. Knitting  -> area_id: 1 (KNI)
// 2. Warehouse -> area_id: 3 (WH)
// 3. BAT       -> area_id: 4 (BAT)
// 4. ADM       -> area_id: 15 (ADM)
// 5. Setting   -> area_id: 8 (SET)
// 6. QC-Final  -> area_id: 10 (FQC)
// 7. QC-Greige -> area_id: 2 (GQC)
// 8. Dyeing    -> area_id: 5 (DYE)
// 9. VAP       -> area_id: 9 (VAP)
// 10. MTN      -> area_id: 12 (MTN)
// 11. Utility  -> area_id: 13 (UTI)
// 12. TSC      -> area_id: 14 (TSC)
// [Column 13 is duplicate MTN in the Excel sheet]
// 14. FM/CFD   -> area_id: 16 (FM/CFD)
// 15. Lab dip  -> area_id: 6 (L-DIP)
// 16. Lab test -> area_id: 11 (L-TES)

const areaMapping = [
  { name: 'Knitting', id: 1, code: 'KNI' },
  { name: 'Warehouse', id: 3, code: 'WH' },
  { name: 'BAT', id: 4, code: 'BAT' },
  { name: 'ADM', id: 15, code: 'ADM' },
  { name: 'Setting', id: 8, code: 'SET' },
  { name: 'QC-Final', id: 10, code: 'FQC' },
  { name: 'QC-Greige', id: 2, code: 'GQC' },
  { name: 'Dyeing', id: 5, code: 'DYE' },
  { name: 'VAP', id: 9, code: 'VAP' },
  { name: 'MTN', id: 12, code: 'MTN' },
  { name: 'Utility', id: 13, code: 'UTI' },
  { name: 'TSC', id: 14, code: 'TSC' },
  { name: 'FM/CFD', id: 16, code: 'FM/CFD' },
  { name: 'Lab dip', id: 6, code: 'L-DIP' },
  { name: 'Lab test', id: 11, code: 'L-TES' }
];

const rawData = [
  { month: '01', name: 'Jan', scores: [89.5, 88.0, 81.5, 94.3, 90.5, 94.3, 98.5, 96.0, 85.0, 99.0, 98.5, 100.0, 100.0, 100.0, 94.3] },
  { month: '02', name: 'Feb', scores: [90.8, 93.3, 85.3, 95.5, 98.3, 98.8, 100.0, 98.0, 94.5, 99.0, 98.5, 100.0, 100.0, 100.0, 98.8] },
  { month: '03', name: 'Mar', scores: [80.5, 85.8, 81.0, 98.5, 87.0, 88.0, 92.3, 92.3, 94.5, 98.5, 98.8, 90.8, 96.0, 90.8, 88.0] },
  { month: '04', name: 'Apr', scores: [80.8, 85.0, 81.3, 99.3, 86.5, 89.5, 99.0, 93.8, 92.3, 98.5, 98.0, 92.0, 94.8, 92.0, 89.5] },
  { month: '05', name: 'May', scores: [85.8, 90.8, 90.0, 91.8, 89.5, 92.3, 97.5, 85.0, 93.3, 93.8, 99.3, 86.0, 95.8, 86.0, 92.3] },
  { month: '06', name: 'Jun', scores: [80.3, 80.3, 89.0, 92.5, 80.5, 91.3, 97.8, 86.8, 89.3, 94.8, 99.0, 94.5, 96.0, 94.5, 91.3] },
  { month: '07', name: 'Jul', scores: [85.3, 82.3, 89.3, 97.3, 89.5, 85.0, 98.5, 95.8, 91.5, 96.3, 99.3, 95.0, 97.3, 95.0, 85.0] },
  { month: '08', name: 'Aug', scores: [86.0, 81.3, 92.5, 99.0, 90.3, 95.3, 97.0, 92.5, 95.3, 98.0, 99.0, 91.0, 96.0, 92.0, 95.3] },
  { month: '09', name: 'Sep', scores: [78.3, 82.5, 87.5, 98.5, 89.3, 87.8, 98.0, 90.0, 97.5, 98.0, 99.5, 91.5, 96.5, 95.0, 87.8] },
  { month: '10', name: 'Oct', scores: [84.5, 89.0, 89.5, 97.3, 91.5, 89.0, 94.5, 90.5, 93.5, 92.3, 97.5, 90.8, 92.0, 96.3, 89.0] }
];

let sql = `-- Crystal 5S Audit - 2026 Historical Monthly Scores with 1-decimal-place precision
-- Source: Official 2026 5S Monthly Matrix (Jan - Oct 2026)
-- Author: Simon (© 2026 Simon)

`;

let count = 0;
for (const row of rawData) {
  sql += `-- === Month ${row.month} (${row.name} 2026) ===\n`;
  for (let i = 0; i < areaMapping.length; i++) {
    const area = areaMapping[i];
    const score = row.scores[i];
    sql += `INSERT INTO historical_monthly_scores (year, month, area_id, score, updated_at)\n`;
    sql += `VALUES (2026, '${row.month}', ${area.id}, ${score.toFixed(1)}, datetime('now'))\n`;
    sql += `ON CONFLICT (year, month, area_id) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at;\n`;
    count++;
  }
  sql += `\n`;
}

fs.writeFileSync('seed/update_historical_scores_2026.sql', sql, 'utf8');
console.log(`Successfully generated seed/update_historical_scores_2026.sql with ${count} statements.`);
