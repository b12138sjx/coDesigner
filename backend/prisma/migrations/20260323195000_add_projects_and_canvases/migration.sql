-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "project_key" VARCHAR(64) NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "brief" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_canvases" (
    "project_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshot_schema_version" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_canvases_pkey" PRIMARY KEY ("project_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_owner_user_id_project_key_key" ON "projects"("owner_user_id", "project_key");

-- CreateIndex
CREATE INDEX "projects_owner_user_id_idx" ON "projects"("owner_user_id");

-- CreateIndex
CREATE INDEX "projects_owner_user_id_updated_at_idx" ON "projects"("owner_user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_canvases" ADD CONSTRAINT "project_canvases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
