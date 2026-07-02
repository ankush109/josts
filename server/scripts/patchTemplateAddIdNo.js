/**
 * Patches the active calibration-certificate template to add the "ID No" row
 * between Name and Sr No in the reference standard table.
 *
 * Creates a new version (v15) and sets it as active.
 *
 * Run: node scripts/patchTemplateAddIdNo.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected to MongoDB");

const { Template, TemplateVersion } = await import("../src/models/Template.js");

const TEMPLATE_KEY = "calibration-certificate";

const tpl = await Template.findOne({ key: TEMPLATE_KEY }).lean();
if (!tpl) { console.error("Template not found"); process.exit(1); }

const activeVersion = await TemplateVersion.findById(tpl.activeVersionId).lean();
if (!activeVersion) { console.error("Active version not found"); process.exit(1); }

console.log(`Found active version: v${activeVersion.versionNumber}`);

// ── Old 2-row block (Name + Sr No only) ───────────────────────────────────────
const OLD_BLOCK = `    <% if (typeof referenceStandards !== 'undefined' && referenceStandards && referenceStandards.length) { %>
      <% referenceStandards.forEach(function(std) { %>
        <tr>
          <td>Name : <%= std.name || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.makeModel || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.validUpto || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.traceabilityCertNo || '' %></td>
        </tr>
        <tr>
          <td>Sr No : <%= std.srNo || '' %></td>
          <td style="border-top: hidden;"></td>
          <td style="border-top: hidden;"></td>
          <td style="border-top: hidden;"></td>
        </tr>
      <% }); %>
    <% } else { %>
      <tr>
        <td>Name :</td>
        <td class="center" style="border-bottom: hidden;"></td>
        <td class="center" style="border-bottom: hidden;"></td>
        <td class="center" style="border-bottom: hidden;"></td>
      </tr>
      <tr>
        <td>Sr No :</td>
        <td style="border-top: hidden;"></td>
        <td style="border-top: hidden;"></td>
        <td style="border-top: hidden;"></td>
      </tr>
    <% } %>`;

// ── New 3-row block (Name + ID No + Sr No) ────────────────────────────────────
const NEW_BLOCK = `    <% if (typeof referenceStandards !== 'undefined' && referenceStandards && referenceStandards.length) { %>
      <% referenceStandards.forEach(function(std) { %>
        <tr>
          <td>Name : <%= std.name || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.makeModel || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.validUpto || '' %></td>
          <td class="center" style="border-bottom: hidden;"><%= std.traceabilityCertNo || '' %></td>
        </tr>
        <tr>
          <td>ID No : <%= std.idNo || '' %></td>
          <td style="border-top: hidden; border-bottom: hidden;"></td>
          <td style="border-top: hidden; border-bottom: hidden;"></td>
          <td style="border-top: hidden; border-bottom: hidden;"></td>
        </tr>
        <tr>
          <td>Sr No : <%= std.srNo || '' %></td>
          <td style="border-top: hidden;"></td>
          <td style="border-top: hidden;"></td>
          <td style="border-top: hidden;"></td>
        </tr>
      <% }); %>
    <% } else { %>
      <tr>
        <td>Name :</td>
        <td class="center" style="border-bottom: hidden;"></td>
        <td class="center" style="border-bottom: hidden;"></td>
        <td class="center" style="border-bottom: hidden;"></td>
      </tr>
      <tr>
        <td>ID No :</td>
        <td style="border-top: hidden; border-bottom: hidden;"></td>
        <td style="border-top: hidden; border-bottom: hidden;"></td>
        <td style="border-top: hidden; border-bottom: hidden;"></td>
      </tr>
      <tr>
        <td>Sr No :</td>
        <td style="border-top: hidden;"></td>
        <td style="border-top: hidden;"></td>
        <td style="border-top: hidden;"></td>
      </tr>
    <% } %>`;

if (!activeVersion.body.includes("Sr No : <%= std.srNo")) {
  console.error("Could not find expected pattern in template body — aborting.");
  process.exit(1);
}

const newBody = activeVersion.body.replace(OLD_BLOCK, NEW_BLOCK);

if (newBody === activeVersion.body) {
  console.error("String replacement had no effect — old block not found exactly. Check whitespace.");
  process.exit(1);
}

const newVersionNumber = activeVersion.versionNumber + 1;

const newVersion = await TemplateVersion.create({
  templateKey:   TEMPLATE_KEY,
  versionNumber: newVersionNumber,
  body:          newBody,
  createdBy:     null,
});

await Template.findByIdAndUpdate(tpl._id, { activeVersionId: newVersion._id });

console.log(`✓ Created v${newVersionNumber} and set as active (${newVersion._id})`);
await mongoose.disconnect();
