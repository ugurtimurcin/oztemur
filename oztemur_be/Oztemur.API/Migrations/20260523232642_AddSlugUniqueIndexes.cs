using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Oztemur.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSlugUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Defensive backfill — before installing the unique index, rename
            // any duplicate slugs by appending "-1", "-2", etc. to the newer
            // rows (oldest row keeps its original slug). Without this the
            // CREATE INDEX would fail on any deployment whose data was seeded
            // before per-row slugs existed and the backfill produced
            // collisions (two members named "Ali" both get slug "ali").
            //
            // suppressTransaction: true is critical — otherwise the UPDATE
            // runs inside the migration's transaction along with the later
            // CREATE INDEX, and any failure of the CREATE rolls the UPDATE
            // back too, leaving the dupes in place. With suppression, each
            // UPDATE auto-commits and the data fix survives a retry loop.
            migrationBuilder.Sql(@"
                WITH ranked AS (
                  SELECT ""Id"",
                         row_number() OVER (PARTITION BY ""Slug"" ORDER BY ""CreatedAt"") - 1 AS rn
                  FROM ""LeadershipMembers""
                  WHERE ""IsDeleted"" = false
                )
                UPDATE ""LeadershipMembers"" lm
                SET ""Slug"" = lm.""Slug"" || '-' || ranked.rn
                FROM ranked
                WHERE lm.""Id"" = ranked.""Id"" AND ranked.rn > 0;
            ", suppressTransaction: true);

            migrationBuilder.Sql(@"
                WITH ranked AS (
                  SELECT ""Id"",
                         row_number() OVER (PARTITION BY ""Slug"" ORDER BY ""CreatedAt"") - 1 AS rn
                  FROM ""Projects""
                  WHERE ""IsDeleted"" = false
                )
                UPDATE ""Projects"" p
                SET ""Slug"" = p.""Slug"" || '-' || ranked.rn
                FROM ranked
                WHERE p.""Id"" = ranked.""Id"" AND ranked.rn > 0;
            ", suppressTransaction: true);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Slug",
                table: "Projects",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeadershipMembers_Slug",
                table: "LeadershipMembers",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_Slug",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_LeadershipMembers_Slug",
                table: "LeadershipMembers");
        }
    }
}
