-- Freeform gallery tags (run once on existing Turso DBs).
-- Safe to re-run: IF NOT EXISTS + INSERT OR IGNORE.

CREATE TABLE IF NOT EXISTS gallery_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_name
  ON gallery_tags (name);

CREATE TABLE IF NOT EXISTS gallery_image_tags (
  image_id INTEGER NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES gallery_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_image_tags_tag
  ON gallery_image_tags (tag_id);

-- Backfill tags from photos that were previously linked via event_id.
INSERT OR IGNORE INTO gallery_tags (name, slug)
SELECT e.title, e.slug
FROM events e
INNER JOIN gallery_images g ON g.event_id = e.id
GROUP BY e.id, e.title, e.slug;

INSERT OR IGNORE INTO gallery_image_tags (image_id, tag_id)
SELECT g.id, t.id
FROM gallery_images g
INNER JOIN events e ON e.id = g.event_id
INNER JOIN gallery_tags t ON t.slug = e.slug;
