export async function logActivity(
  db: D1Database,
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null = null,
  detail: string = ''
): Promise<void> {
  try {
    await db
      .prepare(
        'INSERT INTO activity_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(userId, action, entity, entityId, detail)
      .run();
  } catch (err) {
    console.error('Failed to write activity_log:', err);
  }
}
