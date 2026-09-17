# Demo avatar provenance

All NEXUS seed names, biographies, skills, messages, events, work and reputation are **fictional demo content**. Portrait subjects are **not** the named fictional users and do not endorse this application. Profile biographies explicitly display “Fictional demo profile.” These photographs must not be interpreted as verified identities; no seeded profile has an identity-verification badge.

## Locally bundled photographs

Downloaded from [Pravatar](https://pravatar.cc/) using its public numbered placeholder-photo endpoint `https://i.pravatar.cc/300?img=N`. The downloaded files are 300 × 300 JPEGs. The application uses only `/avatars/*.jpg`; there are **no remote avatar requests at runtime**. URLs below record provenance, not application dependencies.

Pravatar is a placeholder-image service. These copies are for this local demo; a production release should replace them with consented user uploads or images whose production redistribution rights have been independently cleared. No claim of portrait ethnicity, subject identity or individual photograph licence is made.

| Local asset (under `app/public/avatars/`) | Source |
| --- | --- |
| `prince.jpg` | https://i.pravatar.cc/300?img=12 |
| `aarav.jpg` | https://i.pravatar.cc/300?img=13 |
| `meera.jpg` | https://i.pravatar.cc/300?img=47 |
| `kabir.jpg` | https://i.pravatar.cc/300?img=11 |
| `ananya.jpg` | https://i.pravatar.cc/300?img=44 |
| `rohan.jpg` | https://i.pravatar.cc/300?img=3 |
| `isha.jpg` | https://i.pravatar.cc/300?img=49 |
| `zoya.jpg` | https://i.pravatar.cc/300?img=32 |
| `dev.jpg` | https://i.pravatar.cc/300?img=15 |
| `sana.jpg` | https://i.pravatar.cc/300?img=5 |
| `arjun.jpg` | https://i.pravatar.cc/300?img=51 |
| `tara.jpg` | https://i.pravatar.cc/300?img=31 |
| `neil.jpg` | https://i.pravatar.cc/300?img=68 |
| `simran.jpg` | https://i.pravatar.cc/300?img=25 |
| `aditya.jpg` | https://i.pravatar.cc/300?img=60 |
| `naina.jpg` | https://i.pravatar.cc/300?img=16 |
| `yusuf.jpg` | https://i.pravatar.cc/300?img=59 |
| `pema.jpg` | https://i.pravatar.cc/300?img=36 |
| `kavya.jpg` | https://i.pravatar.cc/300?img=20 |
| `aman.jpg` | https://i.pravatar.cc/300?img=57 |
| `ritika.jpg` | https://i.pravatar.cc/300?img=26 |

No avatar generation scripts or third-party image libraries are required at runtime. `accentHue` in each profile provides a deterministic fallback colour for the UI.
