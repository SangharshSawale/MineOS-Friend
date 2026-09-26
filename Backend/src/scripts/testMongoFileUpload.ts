import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

const BASE_URL = 'http://localhost:5000/api'

async function run() {
  console.log('--- Testing MongoDB Direct Image Upload & Storage ---')

  const JWT_SECRET = process.env.JWT_SECRET || "ld4VAoSvPaAFMDHDgbuRUTBYt8Iu7jBOXVwI35Tp9FU";
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { subject: "65f000000000000000000001", expiresIn: "1h" });
  console.log('✓ Admin authenticated');

  // 2. Create a test image buffer
  // 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  const tempFilePath = path.join(__dirname, 'temp_test_image.png')
  fs.writeFileSync(tempFilePath, samplePngBuffer)

  // 3. Upload via FormData
  const formData = new FormData()
  const blob = new Blob([samplePngBuffer], { type: 'image/png' })
  formData.append('file', blob, 'test_hazard_evidence.png')
  formData.append('latitude', '23.7957')
  formData.append('longitude', '86.4304')

  const uploadRes = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Upload failed (${uploadRes.status}): ${err}`)
  }

  const uploadData = await uploadRes.json()
  const storageKey = uploadData.evidence?.storageKey || path.basename(uploadData.url)
  console.log('✓ Upload successful. Response:', {
    url: uploadData.url,
    storageKey,
    hasDataUri: Boolean(uploadData.dataUri),
    dataUriPrefix: uploadData.dataUri ? uploadData.dataUri.slice(0, 30) : null
  })

  if (!uploadData.dataUri || !uploadData.dataUri.startsWith('data:image/png;base64,')) {
    throw new Error('Upload response does not contain valid dataUri')
  }

  // 4. Verify MongoDB directly
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mineos'
  await mongoose.connect(mongoUri)
  const uploadedFileCol = mongoose.connection.collection('uploadedfiles')
  const fileInMongo = await uploadedFileCol.findOne({ storageKey })

  if (!fileInMongo) {
    throw new Error(`UploadedFile with storageKey ${storageKey} not found in MongoDB!`)
  }

  console.log('✓ Verified directly in MongoDB Atlas:')
  console.log('  - Document ID:', fileInMongo._id)
  console.log('  - StorageKey:', fileInMongo.storageKey)
  console.log('  - Original Name:', fileInMongo.originalName)
  console.log('  - Size in Bytes:', fileInMongo.sizeBytes)
  console.log('  - Binary buffer length:', fileInMongo.data ? (fileInMongo.data.buffer ? fileInMongo.data.buffer.length : 'exists') : 'missing')
  console.log('  - Base64 dataUri prefix:', fileInMongo.dataUri?.slice(0, 30))

  // 5. Test retrieving file via GET /api/uploads/:storageKey
  const getRes = await fetch(`${BASE_URL}/uploads/${storageKey}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!getRes.ok) {
    throw new Error(`Failed to retrieve file from GET /api/uploads/${uploadData.storageKey}: ${getRes.status}`)
  }

  const retrievedBuffer = Buffer.from(await getRes.arrayBuffer())
  console.log('✓ Retrieved file from server stream. Bytes received:', retrievedBuffer.length)

  // Clean up
  await uploadedFileCol.deleteOne({ storageKey: uploadData.storageKey })
  await mongoose.disconnect()
  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)

  console.log('🎉 MongoDB Direct Image Storage & Stream test 100% PASSED!')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
