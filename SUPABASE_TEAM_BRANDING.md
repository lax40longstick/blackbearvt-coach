# BenchBoss Coach HQ - Team Branding Production Notes

The app now supports local team branding: product/team name, monogram, team logo upload, and primary/secondary/accent/background colors.

For production persistence, add these columns to your teams table:

    alter table teams add column if not exists brand_product_name text default 'BenchBoss Coach HQ';
    alter table teams add column if not exists brand_short_name text default 'BenchBoss';
    alter table teams add column if not exists brand_primary_color text default '#7dd3d8';
    alter table teams add column if not exists brand_secondary_color text default '#f4cf57';
    alter table teams add column if not exists brand_accent_color text default '#4ad9a8';
    alter table teams add column if not exists brand_background_color text default '#0a0a0a';
    alter table teams add column if not exists brand_monogram text default 'BB';
    alter table teams add column if not exists logo_url text;

Create a Supabase Storage bucket called team-logos.

Recommended bucket policy: authenticated owners/directors/managers can upload or update their team logo; parents can read published logo URLs.

The current app stores the uploaded logo as a local data URL for fast beta testing. Replace that with Supabase Storage upload when multi-device/team persistence is required.
