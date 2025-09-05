// supabase/functions/ai-classify/classifier.ts

type Output = {
  "Work Mode": string | null;
  "Task Category": "Internal" | "External" | null;
  "Activity Type": string | null;
  "Activity": string | null;
  "Work Description": string | null;
  "In Time": string | null;
  "Out Time": string | null;
  "Comments": string | null;
  "Project": string | null;
  "WorkDescId": string | null;
};

const descriptionRules: Array<[RegExp, string]> = [
  [/invoice/i, "Monthly Invoice Generation Activity"],
  [/refresh logs/i, "Power BI Refresh Troubleshooting"],
  [/data validation/i, "Data Validation Activity"],
  [/microsoft fabric/i, "Microsoft Fabric Migration Activity"],
  [/suraj/i, "Discussion with Suraj"],
  [/sporthub/i, "SportHub Project Activities"],
  [/timesheet/i, "Fixing & Updating Timesheet Data"],
  [/technnect website/i, "Technnect Website 2.0"],
  [/cmtl logistics/i, "CMTL Logistics Proposal & Coordination"],
  [/financial report|report approval/i, "Financial Reporting Discussion"],
  [/financial planning|fy2025/i, "FY2025 Financial Planning"],
  [/bug|fix|troubleshoot/i, "Error Troubleshooting"],
  [/demo|portfolio/i, "Technnect Portfolio Demo Building"],
  [/documentation/i, "Project Documentation Work"],
  [/hr report/i, "HR Report Creation"],
  [/presentation/i, "Client Presentation Preparation"],
  [/business development/i, "Business Development Activity"],
  [/ai workflow|ai agent/i, "AI R&D Activity"],
  [/client call|internal call/i, "Call Discussion Activity"],
];

const knownProjects = [
  "technnect",
  "vdofp",
  "godrej capital",
  "butterfly ai tech sol",
  "sporthub",
  "cmtl logistics",
  "apollo",
  "velesium"
];

const internalActivities = ["operations", "hr", "finance", "marketing", "business intelligence"];

function stripNumbering(s: string) { return s.replace(/^\d+\.\s*/, "").trim(); }
function removeTrailingParens(s: string) { return s.replace(/\([^)]*\)\s*$/, "").trim(); }

function extractTimes(s: string) {
  const m = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:to|-)\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (!m) return { start: null, end: null, rest: s };
  const before = s.slice(0, m.index!);
  const after = s.slice(m.index! + m[0].length);
  return { start: m[1].replace(/\s+/g, ""), end: m[2].replace(/\s+/g, ""), rest: (before + after).trim() };
}

export function classifyComment(rawComment: string): Output {
  let comment = rawComment.trim();

  const { start, end, rest } = extractTimes(comment);
  comment = stripNumbering(removeTrailingParens(rest));

  const out: Output = {
    "Work Mode": null,
    "Task Category": null,
    "Activity Type": null,
    "Activity": null,
    "Work Description": null,
    "In Time": start,
    "Out Time": end,
    "Comments": comment,
    "Project": null,
    "WorkDescId": null
  };

  // Work mode
  if (/\bWFH\b/i.test(comment)) out["Work Mode"] = "WFH";
  else if (/\bWFO\b/i.test(comment)) out["Work Mode"] = "Office";

  // Project
  for (const proj of knownProjects) {
    if (comment.toLowerCase().includes(proj)) {
      out["Project"] = proj.charAt(0).toUpperCase() + proj.slice(1);
      break;
    }
  }

  // Task Category
  out["Task Category"] = (out["Project"]?.toLowerCase() === "technnect") ? "Internal" : "External";

  // Activity from rules
  for (const [regex, desc] of descriptionRules) {
    if (regex.test(comment)) {
      out["Work Description"] = desc;
      break;
    }
  }
  if (!out["Work Description"]) out["Work Description"] = comment.split(" ").slice(0, 6).join(" ") + "...";

  out["WorkDescId"] = out["Work Description"].toLowerCase().replace(/\s+/g, "-").slice(0, 64);

  return out;
}
