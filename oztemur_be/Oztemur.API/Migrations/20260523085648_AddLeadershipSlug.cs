using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Oztemur.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadershipSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "LeadershipMembers",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Backfill existing rows so empty-slug uniqueness collisions don't happen
            // the first time an admin opens an old record. Turkish letters are
            // transliterated to ASCII via TRANSLATE before the regex strip.
            migrationBuilder.Sql(@"
                UPDATE ""LeadershipMembers""
                SET ""Slug"" = TRIM(BOTH '-' FROM
                    REGEXP_REPLACE(
                        LOWER(
                            TRANSLATE(
                                COALESCE(""Name""->>'tr', ""Name""->>'en', ''),
                                'ıİĞğÜüŞşÖöÇç',
                                'iigguussoocc'
                            )
                        ),
                        '[^a-z0-9]+',
                        '-',
                        'g'
                    )
                )
                WHERE ""Slug"" IS NULL OR ""Slug"" = '';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Slug",
                table: "LeadershipMembers");
        }
    }
}
