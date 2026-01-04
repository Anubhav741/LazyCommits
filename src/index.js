#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { checkGitStatus, processFiles, pushChanges, waitForThreshold, getBranches, checkoutBranch } from './gitLogic.js';

async function main() {
    program
        .name('Deep')
        .description('Automatically commits top 5 changed files and pushes them.')
        .version('1.0.0');

    program.parse();

    console.log(chalk.blue('Running Deep (Auto Git Pusher) in Continuous Mode...'));
    console.log(chalk.dim('Press Ctrl+C to stop.'));

    // Branch selection
    const branches = await getBranches();
    if (branches) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'branch',
                message: 'Select the branch to work on:',
                choices: branches.all,
                default: branches.current
            }
        ]);

        if (answers.branch !== branches.current) {
            await checkoutBranch(answers.branch);
        } else {
            console.log(chalk.green(`Staying on current branch: ${branches.current}`));
        }
    }

    while (true) {
        let files = await checkGitStatus();

        // Safety check for repo
        if (files === null) {
            console.error(chalk.red('Error reading git status. Retrying in 5s...'));
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
        }

        if (files.length >= 5) {
            await processFiles(files, 5);
            await pushChanges();
            console.log(chalk.blue('\nWaiting for next batch...'));
        } else {
            console.log(chalk.yellow(`\nOnly ${files.length} changed files found (Threshold: 5).`));

            // Wait until we reach the threshold
            files = await waitForThreshold(5);

            // Once promise resolves, we have >= 5 files
            await processFiles(files, 5);
            await pushChanges();
            console.log(chalk.blue('\nWaiting for next batch...'));
        }
    }
}

main();
