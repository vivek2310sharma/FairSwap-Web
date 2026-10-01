import fs from "fs";
import { dryValidatePostalCSV } from "./import-india-postal-data";

const filePath = process.argv[2] || "C:/Users/VivekKumar/Downloads/all-india-pincode-html-csv-Ver-2026.csv";

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Analyzing file: ${filePath}`);
  const report = await dryValidatePostalCSV(filePath);

  console.log("----------------------------------------");
  console.log("=== Official CSV Validation Report ===");
  console.log(`total CSV rows:                                  ${report.totalRows.toLocaleString()}`);
  console.log(`valid parsed rows:                               ${report.validParsedRows.toLocaleString()}`);
  console.log(`malformed PINs:                                  ${report.malformedPins.toLocaleString()}`);
  console.log(`distinct PINs:                                   ${report.distinctPins.toLocaleString()}`);
  console.log(`unavailable admin rows:                          ${report.naAdminRows.toLocaleString()}`);
  console.log(`PINs affected by unavailable admin values:       ${report.affectedPins.toLocaleString()}`);
  console.log(`valid + unavailable admin PINs:                  ${report.validPlusNAPins.toLocaleString()}`);
  console.log(`only-unavailable admin PINs:                     ${report.onlyNAAdminPins.toLocaleString()}`);
  console.log(`exact source-record-key duplicates:              ${report.exactDuplicates.toLocaleString()}`);
  console.log(`duplicate PIN + office-name groups:              ${report.duplicatePinOfficeGroups.toLocaleString()}`);
  console.log(`duplicate groups with differing stored metadata: ${report.duplicatePinOfficeGroupsWithDifferingMetadata.toLocaleString()}`);
  console.log(`same-state multi-district PINs:                  ${report.sameStateMultiDistrictPins.toLocaleString()}`);
  console.log(`real multi-state PINs after sentinel exclusion:  ${report.multiStatePinsExcludingNA.toLocaleString()}`);
  console.log("----------------------------------------");
}

main().catch(console.error);
