const fs = require('fs');
const path = require('path');

// List of route files that need authentication middleware added
const routesToFix = [
  'lenderLoans.js',
  'lenderPayments.js',
  'loansGiven.js',
  'personalLoans.js',
  'budgets.js',
  'companyExpenses.js',
  'billReminders.js',
  'notifications.js',
  'recurring.js',
  'csv.js',
  'export.js',
  'gmail.js',
  'realCibil.js',
  'investments.js',
  'goals.js',
  'netWorth.js',
  'insights.js',
  'banking.js',
  'currency.js',
  'security.js',
  'ml.js',
  'portfolio.js',
  'realEstate.js',
  'retirement.js',
  'subscription.js',
  'tax.js',
  'debt.js',
  'insurance.js',
  'activityLogs.js',
  'cache.js',
  'search.js',
  'dataManagement.js'
];

const functionsRoutesDir = path.join(__dirname, 'functions', 'routes');

routesToFix.forEach(filename => {
  const filepath = path.join(functionsRoutesDir, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Check if auth middleware is already imported
  if (!content.includes('authenticateToken') && !content.includes('authenticate')) {
    console.log(`🔧 Fixing ${filename}...`);
    
    // Add import after other requires
    if (content.includes('const db =')) {
      content = content.replace(
        /(const db = .*?;)/,
        `const { authenticateToken } = require('../middleware/auth');\n$1`
      );
    } else if (content.includes('const router = express.Router();')) {
      content = content.replace(
        /(const router = express\.Router\(\);)/,
        `$1\nconst { authenticateToken } = require('../middleware/auth');`
      );
    }
    
    // Add authenticateToken to routes that access req.user
    // This regex finds route definitions that use req.user but don't have auth middleware
    const routePattern = /router\.(get|post|put|patch|delete)\('([^']+)',\s*(async\s*)?\((req,\s*res(?:,\s*next)?)\)\s*=>\s*{[^}]*req\.user/g;
    
    let modified = false;
    content = content.replace(routePattern, (match, method, route, asyncKeyword, params) => {
      if (!match.includes('authenticateToken')) {
        modified = true;
        const async = asyncKeyword || '';
        return `router.${method}('${route}', authenticateToken, ${async}${params} => {` + match.split('{').slice(1).join('{');
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(filepath, content);
      console.log(`✅ Fixed ${filename}`);
    } else {
      console.log(`ℹ️  ${filename} - No changes needed`);
    }
  } else {
    console.log(`✓ ${filename} already has authentication`);
  }
});

console.log('\n✅ Authentication middleware fix complete!');
