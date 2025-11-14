# PhantomBuster Setup Instructions

## Getting the Exact API Arguments

According to PhantomBuster's API documentation, you need to get the exact JSON arguments from your Phantom's setup.

### Option 1: JSON View in Setup Tab

1. Go to your Phantom: https://phantombuster.com/2589019275719485/phantoms/6317160409132028
2. Open the Phantom's **Settings**
3. Click the **three dot menu** (⋮) in the top right corner
4. Select **"Switch to JSON view"**
5. Copy the entire JSON block - these are the exact parameters needed

### Option 2: API Tab (Requires Developer Mode)

1. Enable Developer Mode:
   - Hover over your name → **My personal settings**
   - Check **"Enable developer mode"**
   - Save settings

2. Open your Phantom's **Console** tab
3. Click the **three dot menu** (⋮) in the right corner
4. Select **"API tab"**
5. Copy the JSON arguments shown there

## What We Need

Once you have the JSON arguments, we need to know:
- What are the exact parameter names?
- Which parameters are required vs optional?
- What format does `postEngagersToExtract` expect?
- Does `companyUrl` need to be extracted or can it be derived?

## Current Implementation

Currently, we're sending:
```json
{
  "companyUrl": "https://www.linkedin.com/company/startup-striders/",
  "postEngagersToExtract": "https://www.linkedin.com/posts/..."
}
```

But the Phantom might expect different parameter names or formats.

