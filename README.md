\# 🎯 MFR WorkTrackr — Attendance Management System



A full-stack attendance management system built for Mindforce Research.



\## Tech Stack

\- \*\*Backend\*\*: Ruby on Rails 8.1 (API mode)

\- \*\*Frontend\*\*: React + Vite

\- \*\*Database\*\*: PostgreSQL

\- \*\*Auth\*\*: JWT



\## Features

\- ✅ Role-based access (Director, Manager, Employee)

\- ✅ Check In / Check Out with live timer

\- ✅ Break tracking (Lunch, Short, Personal)

\- ✅ Leave management with approval workflow

\- ✅ Department-wise attendance monitoring

\- ✅ Break violation detection

\- ✅ Monthly attendance history



\## Roles

| Role | Access |

|------|--------|

| Director (Anupam) | Full system access |

| Manager | Own department only |

| Employee | Own data only |



\## Setup



\### Backend

```bash

cd backend

bundle install

rails db:create db:migrate db:seed

rails server

```



\### Frontend

```bash

cd frontend

npm install

npm run dev

```



\## Demo Credentials

| Role | Email | Password |

|------|-------|----------|

| Director | anupam@mindforce.com | password123 |

| Manager | shikha@mindforce.com | password123 |

| Employee | emp1@mindforce.com | password123 |

