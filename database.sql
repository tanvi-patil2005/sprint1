CREATE DATABASE IF NOT EXISTS kalakriti
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kalakriti;

CREATE TABLE IF NOT EXISTS customer_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artworks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  category VARCHAR(100),
  medium VARCHAR(100),
  description TEXT,
  price VARCHAR(100),
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(30),
  category VARCHAR(100),
  artwork_name VARCHAR(255),
  size VARCHAR(100),
  color VARCHAR(255),
  quantity INT,
  required_date DATE,
  budget VARCHAR(100),
  customization_details TEXT,
  reference_image VARCHAR(500),
  message TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_name VARCHAR(255) NOT NULL,
  completed_order_image VARCHAR(500),
  message TEXT NOT NULL,
  rating INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Shivaji Maharaj Painting', 'Canvas Painting', 'Acrylic', 'Chhatrapati Shivaji Maharaj standing proudly in a powerful vertical posture, symbolizing courage, strength, and the indomitable spirit of Swarajya.', 'Price on Request', 'images/ShivajiMaharaj.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/ShivajiMaharaj.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Swami Samarth Painting', 'Canvas Painting', 'Acrylic', 'Swami Samarth’s divine presence radiating peace, spiritual strength, and blessings, inspiring faith and inner courage.', 'Price on Request', 'images/swamiSamarth.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/swamiSamarth.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Portrait Sketch Art', 'Sketching', NULL, 'Detailed sketch work inspired by memories, portraits, and favorite moments.', 'Price on Request', 'images/sketch.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/sketch.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Traditional Antarpat Design', 'Antarpat Designs', NULL, 'Elegant festive patterns with handcrafted art and traditional color touch.', 'Price on Request', 'images/antarpat.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/antarpat.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Nature Rangoli', 'Rangoli', NULL, 'Custom rangoli designs for festivals and special occasions.', 'Price on Request', 'images/rangoli.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/rangoli.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Theme based Rangoli', 'Rangoli', NULL, 'Custom rangoli designs for festivals and special occasions.', 'Price on Request', 'images/rangoli2.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/rangoli2.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Lord Rangoli', 'Rangoli', NULL, 'Custom rangoli designs for festivals and special occasions.', 'Price on Request', 'images/rangoli3.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/rangoli3.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Colorful Watercolour Art', 'Other Art', NULL, 'Custom watercolour paintings for home decor and gifting.', 'Price on Request', 'images/watercolor.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/watercolor.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Colorful Fridge Magnet Art', 'Other Art', 'Acrylic', 'Custom Fridge magnet designs for your home or office.', 'Price on Request', 'images/magnet.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/magnet.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Shivaji Maharaj Stone Painting', 'Other Art', 'Acrylic', 'Natural stones transformed into colorful art pieces.', 'Price on Request', 'images/stone_painting.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/stone_painting.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Customized Phone Cover', 'Phone Covers', 'Acrylic', 'Personalized mobile cover art with names, quotes, and favorite themes.', 'Price on Request', 'images/cover2.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/cover2.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Wall Art Decor', 'Wall Painting', 'Acrylic', 'Room-inspired wall paintings designed to match your space and style.', 'Price on Request', 'images/wall_painting.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/wall_painting.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Eye’s Sketch', 'Sketches', 'Graphite pencil', 'A detailed eyes sketch capturing natural expressions through delicate lines, shading, and artistic depth.', 'Price on Request', 'images/eyes_sketch.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/eyes_sketch.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Eye’s Sketch', 'Sketches', 'Graphite pencil', 'A detailed eyes sketch capturing natural expressions through delicate lines, shading, and artistic depth.', 'Price on Request', 'images/eyes_sketch1.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/eyes_sketch1.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Mini Customized Art', 'Other Art', NULL, 'A charming mini painting created as a thoughtful and personalized gift, capturing emotions and memories in a small, beautiful artwork.', 'Price on Request', 'images/gift_painting.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/gift_painting.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Custom Portrait work', 'Portraits', 'Acrylic', 'A beautiful portrait painting that captures the subject’s personality and emotions through expressive details, colors, and artistic strokes.', 'Price on Request', 'images/portrait.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/portrait.jpeg');
INSERT INTO artworks (name, category, medium, description, price, image)
SELECT 'Canvas painting', 'Canvas Painting', 'Acrylic', 'A vibrant canvas painting created with expressive colors and artistic strokes, bringing emotions, creativity, and imagination to life.', 'Price on Request', 'images/canvas_painting.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image = 'images/canvas_painting.jpeg');

INSERT INTO reviews (customer_name, message, rating)
SELECT 'Komal', 'The portrait was beautiful and looked exactly like the reference photo. Tanvi understood every small detail.', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Komal' AND message LIKE 'The portrait was beautiful%');
INSERT INTO reviews (customer_name, message, rating)
SELECT 'Mayuri', 'I loved the customized painting. The colors, finishing, and packaging were all perfect.', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Mayuri' AND message LIKE 'I loved the customized painting%');
INSERT INTO reviews (customer_name, message, rating)
SELECT 'Yash', 'Absolutely loved my Chintamani Bappa hand-painted phone cover! The artwork is beautiful, detailed, and made with so much devotion. It looks unique and exactly as I wanted. Truly satisfied with the work!', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Yash' AND message LIKE 'Absolutely loved my Chintamani Bappa%');
INSERT INTO reviews (customer_name, message, rating)
SELECT 'Bhavika', 'Absolutely loved my portrait sketch! The detailing and likeness are amazing. It looks beautifully hand-drawn and was created with so much care and creativity. Truly happy with the final result!', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Bhavika' AND message LIKE 'Absolutely loved my portrait sketch%');
INSERT INTO reviews (customer_name, message, rating)
SELECT 'Pallavi', 'Absolutely loved my Lord Krishna’s phone cover! The artwork is beautiful, detailed, and made with so much devotion. It looks unique and exactly as I wanted. Truly satisfied with the work!', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Pallavi' AND message LIKE 'Absolutely loved my Lord Krishna%');
INSERT INTO reviews (customer_name, message, rating)
SELECT 'Namita & Apurv', 'My Antarpat design made our special day even more memorable. It was creative, neat, and delivered on time.', 5
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Namita & Apurv' AND message LIKE 'My Antarpat design%');