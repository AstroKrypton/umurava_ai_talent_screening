import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseApplicantsCsv } from "../src/services/applicantImportService";

describe("parseApplicantsCsv", () => {
  it("parses applicants while providing warnings for missing optional fields", () => {
    const csv = [
      "firstName,lastName,email,headline,location,skills",
      "Ada,Lovelace,ada@example.com,, ,JavaScript;Mathematics",
    ].join("\n");

    const result = parseApplicantsCsv(csv, { defaultSource: "external" });

    assert.equal(result.applicants.length, 1, "expected a single applicant to be parsed");
    assert.ok(result.warnings.length > 0, "expected warnings to be returned");

    const applicant = result.applicants[0];
    assert.equal(applicant.firstName, "Ada");
    assert.equal(applicant.lastName, "Lovelace");
    assert.equal(applicant.email, "ada@example.com");
    assert.equal(applicant.headline, "Ada Lovelace", "headline should fall back to derived full name");
    assert.equal(applicant.location, "Unknown", "location should fall back when missing");
    assert.equal(applicant.source, "external");
    assert.equal(applicant.skills.length, 2, "skills string should be converted into individual skills");
    assert.ok(
      result.warnings.some((warning) => warning.message.includes("experience")),
      "expected warning about missing experience entries",
    );
  });

  it("defaults availability when missing", () => {
    const csv = [
      "firstName,lastName,email,headline,location,skills",
      "Ororo,Monroe,storm@example.com,Storm,,Lightning control",
    ].join("\n");

    const result = parseApplicantsCsv(csv, { defaultSource: "external" });

    assert.equal(result.applicants.length, 1, "expected applicant even without availability column");
    const applicant = result.applicants[0];
    assert.equal(applicant.availability.status, "Open to Opportunities");
    assert.equal(applicant.availability.type, "Full-time");
    assert.ok(
      result.warnings.some((warning) => warning.message.includes("Availability")),
      "expected a warning about defaulting availability",
    );
  });
});
