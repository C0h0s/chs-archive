const fs = require('fs');
const path = require('path');

setInterval(() => {
  const uploadsDir = path.join(__dirname, 'public/uploads');
  fs.readdir(uploadsDir, (err, files) => {
    files.forEach(file => {
      if(file.lastAccessed < Date.now() - 30*24*60*60*1000) { // 30 days
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    });
  });
}, 24 * 60 * 60 * 1000); // Daily cleanup