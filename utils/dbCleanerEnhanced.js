const inquirer = require('inquirer');
const DBCleaner = require('./dbCleaner');

class EnhancedDBCleaner extends DBCleaner {
  async showMenu() {
    console.clear();
    console.log('=== DATABASE CLEANER ===\n');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'View Database Statistics', value: 'stats' },
          { name: 'Soft Clean (Mark as Inactive)', value: 'soft' },
          { name: 'Selective Cleaning', value: 'selective' },
          { name: 'Clean Expired Tokens', value: 'tokens' },
          { name: 'Full Clean (DANGER)', value: 'full' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    return action;
  }

  async handleSelective() {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'deleteInactive',
        message: 'Delete inactive users?',
        default: false
      },
      {
        type: 'confirm',
        name: 'deleteUnverified',
        message: 'Delete unverified users?',
        default: false
      },
      {
        type: 'confirm',
        name: 'keepAdmins',
        message: 'Keep admin users?',
        default: true
      },
      {
        type: 'input',
        name: 'deleteBeforeDate',
        message: 'Delete users created before (YYYY-MM-DD, leave empty for none):',
        validate: (input) => {
          if (!input) return true;
          return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter date in YYYY-MM-DD format';
        }
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to proceed?',
        default: false
      }
    ]);

    if (answers.confirm) {
      await this.selectiveClean(answers);
      console.log('✓ Selective cleaning completed');
    } else {
      console.log('Operation cancelled');
    }
  }

  async handleFullClean() {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '⚠️  WARNING: This will delete ALL users. Are you absolutely sure?',
        default: false
      }
    ]);

    if (confirm) {
      const { finalConfirm } = await inquirer.prompt([
        {
          type: 'input',
          name: 'finalConfirm',
          message: 'Type "DELETE ALL" to confirm:',
          validate: (input) => input === 'DELETE ALL' || 'Confirmation text does not match'
        }
      ]);

      if (finalConfirm === 'DELETE ALL') {
        await this.fullClean(true);
        console.log('✓ Full cleaning completed');
      }
    } else {
      console.log('Operation cancelled');
    }
  }

  async runInteractive() {
    try {
      await this.connect();
      
      let action;
      do {
        action = await this.showMenu();
        
        switch (action) {
          case 'stats':
            const stats = await this.getStats();
            console.table(stats);
            await this.pressToContinue();
            break;
          case 'soft':
            await this.softClean();
            console.log('✓ Soft cleaning completed');
            await this.pressToContinue();
            break;
          case 'selective':
            await this.handleSelective();
            await this.pressToContinue();
            break;
          case 'tokens':
            await this.cleanExpiredTokens();
            console.log('✓ Expired tokens cleaned');
            await this.pressToContinue();
            break;
          case 'full':
            await this.handleFullClean();
            await this.pressToContinue();
            break;
        }
      } while (action !== 'exit');
      
      await this.disconnect();
      console.log('Goodbye! 👋');
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  async pressToContinue() {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
  }
}

if (require.main === module) {
  const enhancedCleaner = new EnhancedDBCleaner();
  enhancedCleaner.runInteractive();
}

module.exports = EnhancedDBCleaner;