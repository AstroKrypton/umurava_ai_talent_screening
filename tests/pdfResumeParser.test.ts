import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumeSchema } from "../src/services/pdfResumeParser";

describe("resumeSchema", () => {
  it("coerces loose Gemini output into clean applicant data", () => {
    const parsed = resumeSchema.parse({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@navy.mil",
      headline: "  pioneer of COBOL  ",
      bio: null,
      location: "   Arlington, VA   ",
      skills: [
        { name: "Compilers", level: null, yearsOfExperience: null },
        { name: "Leadership", level: "Wizard", yearsOfExperience: "12" },
      ],
      experience: [],
      education: [
        { institution: "Yale University", degree: null, fieldOfStudy: null, startYear: "1928", endYear: "1934" },
      ],
      projects: [],
      availability: { status: null, type: null, startDate: null },
      languages: [],
      certifications: [],
      socialLinks: { linkedin: "  ", github: null },
      resumeUrl: null,
      rawResumeText: null,
    });

    assert.equal(parsed.headline, "pioneer of COBOL");
    assert.equal(parsed.location, "Arlington, VA");
    assert.equal(parsed.skills[0].level, "Intermediate");
    assert.equal(parsed.skills[0].yearsOfExperience, 0);
    assert.equal(parsed.skills[1].yearsOfExperience, 12);
    assert.equal(parsed.skills[1].level, "Intermediate");
    assert.equal(parsed.education[0].startYear, 1928);
    assert.equal(parsed.education[0].endYear, 1934);
    assert.equal(parsed.availability.status, "Open to Opportunities");
    assert.equal(parsed.availability.type, "Full-time");
    assert.equal(parsed.socialLinks?.linkedin, undefined);
    assert.equal(parsed.resumeUrl, undefined);
    assert.equal(parsed.rawResumeText, undefined);
  });
});
