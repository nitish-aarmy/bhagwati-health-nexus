# Bhagwati Health Nexus

You are a team of world-class software architects, UI/UX designers, healthcare software engineers, cybersecurity experts, database architects, DevOps engineers, mobile developers, Electron developers, React developers, Node.js developers, TypeScript experts, and healthcare workflow consultants.

Your task is to design and develop a production-grade Hospital ERP + EMR + CRM system for Bhagwati Hospital, Daltonganj, India.

The system must support Desktop (Windows), Android Mobile Application, and Web APIs using one unified backend.

======================================================================

PROJECT NAME

======================================================================

Bhagwati Smart Hospital ERP

Tagline:

One Hospital. One Secure Platform.

======================================================================

TECH STACK

======================================================================

Frontend Desktop

- Electron

- React

- TypeScript

- Vite

Frontend Mobile

- React Native (preferred) OR Flutter (choose whichever gives better long-term maintainability)

- Material You support

- Offline-first synchronization

Backend

- Node.js

- NestJS

- PostgreSQL

- Redis

- Prisma ORM

Storage

- PostgreSQL

- Object storage for reports

- Secure encrypted file storage

Authentication

- JWT

- Refresh Tokens

- OTP Login

- Role Based Access Control

- Biometric authentication

- Device binding

Security

- AES-256 encryption

- HTTPS

- SQL Injection protection

- XSS protection

- CSRF protection

- Rate limiting

- Audit logging

- Immutable logs

- Field-level encryption for sensitive patient data

- Automatic logout

- Device authorization

- Session monitoring

- Encrypted backups

======================================================================

GOAL

======================================================================

Develop a modern hospital ecosystem where every employee, doctor, technician, accountant, pharmacist, receptionist, administrator, and patient has their own login and permissions.

Every action must be logged.

Every patient interaction must be traceable.

The software must reduce paperwork while improving efficiency.

======================================================================

USER TYPES

======================================================================

Super Admin

Hospital Owner

Administrator

Receptionist

Doctor

Pathologist

Lab Technician

Radiologist

Nurse

Pharmacist

Billing Executive

Accountant

Telecaller

Marketing Executive

Follow-up Executive

Patient

Family Member (optional)

======================================================================

PATIENT APP

======================================================================

Patient Login

Login using:

Registered Mobile Number

OTP

Biometric (future)

Patient Dashboard

Display:

Profile

Hospital ID

Medical History

Previous Visits

Current Treatment

Doctor Details

Upcoming Appointment

Lab Reports

Radiology Reports

Prescription History

Medicine History

Bills

Payment Receipts

Outstanding Amount

Insurance Details

Vaccination Records

Admission History

Discharge Summary

Download PDF Reports

Appointment Booking

Cancel Appointment

Reschedule Appointment

Teleconsultation

Notifications

Health Tips

Feedback

Chat Support

Emergency Contact

Digital Health Card

QR Code

======================================================================

HOSPITAL STAFF APP

======================================================================

Reception

Patient Registration

Appointment

Walk-in

Queue Management

Token System

Search Patient

Insurance Verification

Doctor

Today's Patients

Diagnosis

Prescription

Lab Recommendation

Medical Notes

Voice Notes

Digital Signature

Pathologist

Sample Collection

Processing

Report Approval

Report Printing

Digital Signature

Lab Technician

Sample Status

Barcode

Machine Integration Ready

Follow-up Team

Today's Follow-ups

Pending Calls

Call Outcome

Next Follow-up Date

Reminder

Complaint Management

Sales CRM

Referral Tracking

Doctor Visit History

Pharmacy

Medicine Sales

Inventory

Expiry

Purchase

Returns

Doctor Prescription Link

Accounts

Billing

Payments

Refund

Insurance

Cashbook

Reports

Administration

User Management

Permissions

Audit Logs

Backup

Analytics

======================================================================

PATIENT CRM

======================================================================

Every patient must have:

Lead Source

Reference Doctor

Visit Timeline

Communication History

Call History

SMS History

WhatsApp History

Email History

Medical Timeline

Payment Timeline

Complaint Timeline

Follow-up Timeline

======================================================================

CALLING SYSTEM

======================================================================

Hospital staff should never expose their personal phone numbers.

Design an integrated calling module.

Requirements:

Click patient phone number

Automatically initiate call through the hospital registered number

Call outcome selection

Duration

Recording support (where legally permitted)

Notes

Reminder

Follow-up scheduling

Missed call tracking

Incoming call identification

Automatic patient lookup

Click-to-call

Call logs

======================================================================

FOLLOW-UP ENGINE

======================================================================

Automatic reminders

Medicine reminder

Appointment reminder

Lab reminder

Payment reminder

Birthday wishes

Festival wishes

Health campaign

Vaccination reminder

Doctor revisit reminder

Custom reminders

======================================================================

REPORTS

======================================================================

Pathology Reports

Radiology Reports

Prescription

Discharge Summary

Billing

Daily Collection

Revenue

Doctor Performance

Lab Performance

Follow-up Performance

Medicine Sales

Inventory

Audit

======================================================================

SECURITY

======================================================================

The application must be breach resistant.

Requirements:

Encrypted database

Encrypted backups

Encrypted API communication

Role-based permissions

No direct database access

Audit trail

Automatic logout

Suspicious login detection

Device authorization

Two-factor authentication

Password hashing

Data masking

Secure logging

OWASP compliant architecture

======================================================================

OFFLINE MODE

======================================================================

Desktop should continue functioning without internet.

Mobile should cache necessary data.

Automatic synchronization.

Conflict resolution.

======================================================================

UI DESIGN

======================================================================

Design language:

Modern Neomorphic UI

Soft shadows

Rounded cards

Minimalistic

Hospital color palette

Blue

White

Light Grey

Professional typography

Dark Mode

Light Mode

Responsive layouts

Accessibility compliant

High performance

Animations should be subtle and smooth.

======================================================================

AI FEATURES

======================================================================

Doctor assistant

Prescription suggestions

Medical history summary

Duplicate patient detection

Abnormal report detection

Reminder prediction

Revenue forecasting

Inventory prediction

Patient risk scoring

Smart search

OCR for documents

Voice dictation

======================================================================

NOTIFICATIONS

======================================================================

SMS

WhatsApp

Email

Push Notifications

In-app notifications

======================================================================

DEPLOYMENT

======================================================================

Desktop:

Electron installer

Auto update

Android:

Play Store ready

APK

Backend:

Docker

Production environment

Automated backup

Health monitoring

======================================================================

CODE QUALITY

======================================================================

Generate modular, scalable, enterprise-grade architecture.

Use SOLID principles.

Use clean architecture.

Use reusable components.

Strong TypeScript typing.

Production-ready folder structure.

Proper error handling.

Unit-test ready architecture.

No placeholder implementations.

Generate the project module by module so that each module integrates cleanly with the others. and yes i want to integrate this app ,bhagwat i pathology nexus chitra bill flow to bhagwati hospital nexus app so design it in such a way that it can be integrated among others

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3943a394-44bb-4f16-a154-61f8dfb43bf6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
