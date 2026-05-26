import { initializeFirestoreCollections } from '../src/services/firebaseInit.service.js';

const init = async () => {
  try {
    await initializeFirestoreCollections();
    console.log('\nFirestore initialization successful.');
    process.exit(0);
  } catch (error) {
    console.error('\nFirestore initialization failed:', error);
    process.exit(1);
  }
};

init();
