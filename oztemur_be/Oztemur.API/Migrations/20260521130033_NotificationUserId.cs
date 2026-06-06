using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Oztemur.API.Migrations
{
    /// <inheritdoc />
    public partial class NotificationUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pre-existing notifications have no recipient and would be
            // orphaned (invisible to every user) under the new per-user model.
            // Drop them so the feed starts clean — fresh events repopulate it.
            migrationBuilder.Sql("DELETE FROM \"Notifications\";");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Notifications",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Notifications");
        }
    }
}
