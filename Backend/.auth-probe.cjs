require('dotenv').config({ path: `${__dirname}/.env` });
const mongoose = require('mongoose');
const { User } = require('./dist/models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'admin@minsos.coal.gov.in' }).select('+passwordHash');
  console.log(JSON.stringify({
    found: Boolean(user),
    id: user?.id,
    idType: typeof user?.id,
    role: user?.role,
    roleType: typeof user?.role,
    passwordHashPresent: Boolean(user?.passwordHash),
    passwordHashType: typeof user?.passwordHash,
  }));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
