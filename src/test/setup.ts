import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Nettoyage après chaque test
afterEach(() => {
  cleanup();
});
