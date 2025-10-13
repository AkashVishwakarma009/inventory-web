#!/usr/bin/env node

/**
 * Setup script for Supabase SSL configuration
 * This script configures SSL settings for proper Supabase connection
 */

const fs = require('fs');
const path = require('path');

// Configure Node.js to handle Supabase SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Set PostgreSQL SSL environment variables for Supabase compatibility
process.env.PGSSLMODE = 'require';
process.env.PGSSLCERT = '';
process.env.PGSSLKEY = '';
process.env.PGSSLROOTCERT = '';

console.log('✓ Supabase SSL configuration applied');
console.log('✓ Ready for database migration');

// Export configuration for other scripts
module.exports = {
  setupSupabaseSSL: () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    process.env.PGSSLMODE = 'require';
  }
};