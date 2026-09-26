import jwt from 'jsonwebtoken';
import { env } from '../config/env';

async function testUpload() {
  const token = jwt.sign({ role: 'safety_officer' }, env.jwtSecret, { subject: '65f000000000000000000001', expiresIn: '1h' });

  const formData = new FormData();
  const fileBlob = new Blob(['Test dummy evidence content for QA verification'], { type: 'image/png' });
  formData.append('file', fileBlob, 'qa_test_evidence.png');
  formData.append('capturedAt', new Date().toISOString());
  formData.append('latitude', '23.7505');
  formData.append('longitude', '86.4208');

  const uploadRes = await fetch('http://localhost:5000/api/uploads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const uploadJson = await uploadRes.json();
  console.log('Upload HTTP status:', uploadRes.status);
  console.log('Upload response:', uploadJson);

  if (uploadRes.status === 201 && uploadJson.url) {
    const downloadRes = await fetch(`http://localhost:5000${uploadJson.url}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Download HTTP status:', downloadRes.status);
  }
}

testUpload().catch(console.error);
