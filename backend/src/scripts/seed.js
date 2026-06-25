/**
 * Seeds the database with demo data so the site is immediately testable:
 *   - one login per role (patient / dentist / clinic manager / admin)
 *   - 6 clinics across Lagos, Abuja and Ibadan, matching the clinic
 *     directory shown on the frontend
 *
 * Run with:  npm run seed
 * (requires MONGODB_URI to be set in backend/.env)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Clinic = require('../models/Clinic');
const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await User.deleteMany({});
    await Clinic.deleteMany({});

    // ── Test accounts (one per role, all pre-verified so they can log in immediately) ──
    const adminUser = await User.create({
      email: 'admin@homodenthealth.ng',
      password: 'Admin@123456',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
      isVerified: true,
      isActive: true
    });

    const dentistUser = await User.create({
      email: 'dentist@homodenthealth.ng',
      password: 'Dentist@123456',
      firstName: 'Dr. John',
      lastName: 'Okafor',
      role: 'dentist',
      isVerified: true,
      isActive: true
    });

    const clinicManagerUser = await User.create({
      email: 'clinicadmin@homodenthealth.ng',
      password: 'ClinicAdmin@123456',
      firstName: 'Funke',
      lastName: 'Adeyemi',
      role: 'clinic_manager',
      isVerified: true,
      isActive: true
    });

    const patientUser = await User.create({
      email: 'patient@homodenthealth.ng',
      password: 'Patient@123456',
      firstName: 'Tunde',
      lastName: 'Bello',
      role: 'user',
      phone: '+2348012345000',
      isVerified: true,
      isActive: true
    });

    // ── Clinics (matches the directory shown in the UI) ──
    const clinicDefs = [
      {
        name: 'Lagos Dental Centre',
        description: 'Full-service general dentistry in the heart of Victoria Island.',
        location: { address: '12 Adeola Odeku St, Victoria Island', city: 'Lagos', state: 'Lagos', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [3.4216, 6.4281] } },
        contact: { phone: '+2348012345001', email: 'lagosdental@homodenthealth.ng' },
        hours: dailyHours('08:00', '20:00', { sunday: null }),
        specialties: ['general'],
        emergencyAvailable: true,
        ratingsSeed: 4.8,
        manager: clinicManagerUser._id,
        staff: [dentistUser._id]
      },
      {
        name: 'Smile Health Clinic',
        description: 'Friendly neighbourhood dental clinic serving Ikeja and environs.',
        location: { address: '45 Allen Avenue, Ikeja', city: 'Lagos', state: 'Lagos', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [3.3515, 6.6018] } },
        contact: { phone: '+2348012345002', email: 'smilehealth@homodenthealth.ng' },
        hours: dailyHours('08:00', '18:00', { saturday: null, sunday: null }),
        specialties: ['general'],
        emergencyAvailable: false,
        ratingsSeed: 4.6
      },
      {
        name: 'Abuja Oral Health Centre',
        description: '24-hour oral surgery and emergency dental care in Wuse 2.',
        location: { address: 'Plot 22, Aminu Kano Crescent, Wuse 2', city: 'Abuja', state: 'FCT', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [7.4951, 9.0765] } },
        contact: { phone: '+2348012345003', email: 'abujaoral@homodenthealth.ng' },
        hours: dailyHours('00:00', '23:59'),
        specialties: ['oral_surgery'],
        emergencyAvailable: true,
        ratingsSeed: 4.9
      },
      {
        name: 'BrightSmile Orthodontics',
        description: 'Specialist braces, aligners and orthodontic care.',
        location: { address: '8 Ribadu Road, Ikoyi', city: 'Lagos', state: 'Lagos', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [3.4316, 6.4541] } },
        contact: { phone: '+2348012345004', email: 'brightsmile@homodenthealth.ng' },
        hours: dailyHours('09:00', '17:00', { saturday: null, sunday: null }),
        specialties: ['orthodontics'],
        emergencyAvailable: false,
        ratingsSeed: 4.7
      },
      {
        name: 'Ibadan Family Dental',
        description: 'Pediatric-friendly family dentistry on Ring Road.',
        location: { address: '15 Ring Road', city: 'Ibadan', state: 'Oyo', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [3.9183, 7.3775] } },
        contact: { phone: '+2348012345005', email: 'ibadanfamily@homodenthealth.ng' },
        hours: dailyHours('08:00', '19:00', { sunday: null }),
        specialties: ['pediatric_dentistry'],
        emergencyAvailable: false,
        ratingsSeed: 4.5
      },
      {
        name: 'Periocare Specialists',
        description: 'Gum disease, periodontics and deep-cleaning specialists.',
        location: { address: '3 Awolowo Road, Ikoyi', city: 'Lagos', state: 'Lagos', country: 'Nigeria', coordinates: { type: 'Point', coordinates: [3.4316, 6.4474] } },
        contact: { phone: '+2348012345006', email: 'periocare@homodenthealth.ng' },
        hours: dailyHours('08:00', '18:30', { saturday: null, sunday: null }),
        specialties: ['periodontics'],
        emergencyAvailable: false,
        ratingsSeed: 4.6
      }
    ];

    const clinics = [];
    for (const def of clinicDefs) {
      const { ratingsSeed, ...rest } = def;
      const clinic = await Clinic.create({
        ...rest,
        services: [
          { name: 'General Check-up', category: 'preventive', description: 'Routine dental examination', price: 5000, duration: 30 },
          { name: 'Professional Cleaning', category: 'preventive', description: 'Teeth cleaning and scaling', price: 8000, duration: 45 }
        ],
        status: 'active',
        ratings: { averageRating: ratingsSeed, totalRatings: Math.floor(Math.random() * 40) + 10 },
        accreditation: { verified: true, verifiedAt: new Date() }
      });
      clinics.push(clinic);
    }

    // Link the clinic-manager and dentist test accounts to the first clinic
    // so their respective dashboards have real data to show.
    clinicManagerUser.clinic = clinics[0]._id;
    await clinicManagerUser.save();
    dentistUser.clinic = clinics[0]._id;
    await dentistUser.save();

    logger.info('✅ Database seeded successfully\n');
    logger.info('Test accounts (all pre-verified, ready to log in):');
    logger.info('  Patient:        patient@homodenthealth.ng        / Patient@123456');
    logger.info('  Dentist:        dentist@homodenthealth.ng        / Dentist@123456');
    logger.info('  Clinic manager: clinicadmin@homodenthealth.ng    / ClinicAdmin@123456');
    logger.info('  Admin:          admin@homodenthealth.ng          / Admin@123456');
    logger.info(`\n${clinics.length} clinics created.`);

    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

function dailyHours(open, close, overrides = {}) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours = {};
  days.forEach(day => {
    if (Object.prototype.hasOwnProperty.call(overrides, day) && overrides[day] === null) {
      hours[day] = { open: null, close: null };
    } else {
      hours[day] = { open, close };
    }
  });
  return hours;
}

seedDatabase();
