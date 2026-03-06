import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_API_SECRET } from '../../../config/config.service.js';

cloudinary.config({ 
  cloud_name: 'dqj8rz9cf', 
  api_key: '613111898773759', 
  api_secret: CLOUDINARY_API_SECRET
});

export default cloudinary