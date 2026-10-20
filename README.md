KopiTalk
A gamified, low-pressure Mother Tongue practice app for young adults, built for HackIT 2026. Practise Chinese, Malay and Tamil a little at a time, using words from your own daily life.

Live demo: https://underflowhackit.netlify.app

Problem Statement
(AWS) Problem Statement 1: Integrating Mother Tongue into the Daily Lives of Young Adults

Target Audience 
Young adults who already know some of their Mother Tongue and want an easy way to keep practiving

Tech Stack
Frontend: plain HTML, CSS and JavaScript (no build step), in public/
Database and sign-in: Supabase (Postgres, Row Level Security, Auth)
Edge functions (Supabase): festival-verify (photo and answer check) and get-word-meaning (meanings and sentence check)
AI: Claude models, called only from the edge functions
Photo text reading (OCR): the photo is sent to a Supabase edge function where Claude reads the text. Tesseract.js in the browser is the offline backup.
Chinese word segmentation runs in the browser
Hosting: Netlify

Languages
Chinese (zh), Malay (ms), Tamil (ta)
Fully completed Chinese

Team Underflow 
Qiu Lixian, Jayden Ong, Ong Liang Cheng, Trina Kee

See guide.txt for setup instructions. The website itself needs no installs. Edge functions need the Supabase CLI.

Security note
The Supabase URL and anon key in public/js/shared/supabaseClient.js are public by design; access is controlled by Row Level Security. Secret keys (such as the AI API key and the Supabase service role key) are stored as Supabase function secrets and are never committed to this repository.