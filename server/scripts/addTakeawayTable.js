import 'dotenv/config';
import mongoose from 'mongoose';
import Table from '../models/Table.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await Table.findOne({ number: 0 });
  if (!existing) {
    await Table.create({ number: 0, name: 'Mang về', capacity: 1 });
    console.log('✅ Created Takeaway Table');
  } else {
    console.log('Takeaway Table already exists');
  }
  process.exit(0);
}

run().catch(e => console.error(e));
