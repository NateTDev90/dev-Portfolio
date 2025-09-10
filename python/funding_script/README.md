# Funding Report Generator

## Overview
A Python script that processes funding data by matching CSV and Excel files to generate member funding reports. The script combines transaction data from CSV files with invoice data from Excel files, excluding joint owners from the final report.

## Features
- **Data Matching**: Matches records between CSV and Excel files using Application Numbers/Invoice Numbers
- **Joint Owner Filtering**: Automatically excludes joint owners from the final report
- **Data Validation**: Validates required columns and handles missing data gracefully
- **Excel Formatting**: Auto-fits column widths and applies currency formatting
- **Date-based Output**: Generates timestamped output files

## Requirements
- Python 3.x
- pandas
- openpyxl
- glob
- csv

## Input Files
1. **CSV File**: Contains application data with columns:
   - APPLICATION NUMBER
   - FIRSTNAME
   - LASTNAME
   - FUNDINGAMOUNT
   - ACCTNUMBER
   - PRODNAME
   - RELATIONSHIP (optional)

2. **Excel File**: `Transaction_Listing.xlsx` with sheet "Report (Page 1)" containing:
   - Invoice Number

## Configuration
Update the following variables in the script:
- `WORKING_DIRECTORY`: Directory containing input files
- `REPORT_OUTPUT_DIRECTORY`: Directory for output reports
- `CSV_FILE_PATTERN`: Pattern to find CSV files (default: "*.csv")
- `EXCEL_FILE`: Name of Excel file (default: "Transaction_Listing.xlsx")
- `SHEET_NAME`: Excel sheet name (default: "Report (Page 1)")

## Usage
1. Place CSV and Excel files in the working directory
2. Configure directory paths in the script
3. Run the script:
   ```bash
   python funding_report.py
   ```

## Output
- Generates `MbrFundingReport MMDDYY.xlsx` in the specified output directory
- Contains matched records with currency formatting applied to funding amounts
- Excludes joint owners based on RELATIONSHIP column

## Error Handling
- Validates required columns exist
- Handles missing files gracefully
- Provides clear error messages for troubleshooting