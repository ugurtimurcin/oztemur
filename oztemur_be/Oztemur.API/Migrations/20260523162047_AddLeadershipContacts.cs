using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Oztemur.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadershipContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "LeadershipMembers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LinkedInUrl",
                table: "LeadershipMembers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "LeadershipMembers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "LeadershipMembers");

            migrationBuilder.DropColumn(
                name: "LinkedInUrl",
                table: "LeadershipMembers");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "LeadershipMembers");
        }
    }
}
