// scripts/verify_samples.js
const fs = require('fs');
const path = require('path');
const fileAnalyzer = require('../backend/src/services/fileAnalyzer');
const Detector = require('../backend/src/services/detector');
const BehavioralEmulator = require('../backend/src/services/behavioralEmulator');

async function testAll() {
  const detector = new Detector({ emit: () => {} });
  const emulator = new BehavioralEmulator({ emit: () => {} });
  const testSamplesDir = path.resolve(__dirname, '..', 'test_samples');

  const categories = fs.readdirSync(testSamplesDir).filter(f => {
    return fs.statSync(path.join(testSamplesDir, f)).isDirectory();
  });

  console.log('='.repeat(95));
  console.log(
    'FILE'.padEnd(35) +
    'TYPE'.padEnd(12) +
    'STATIC'.padEnd(9) +
    'BEHAV'.padEnd(9) +
    'TOTAL'.padEnd(9) +
    'VERDICT'.padEnd(11) +
    'MALWARE TYPE'
  );
  console.log('='.repeat(95));

  for (const cat of categories) {
    const catPath = path.join(testSamplesDir, cat);
    const files = fs.readdirSync(catPath);

    for (const file of files) {
      const filePath = path.join(catPath, file);
      const ext = path.extname(file).toLowerCase();
      const mime = ext === '.pdf' ? 'application/pdf' :
                   ext === '.js' ? 'application/javascript' :
                   ext === '.exe' ? 'application/x-msdownload' :
                   ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                   'text/plain';

      const staticRes = await fileAnalyzer.analyze(filePath, file, mime);
      const staticDet = detector.evaluateStatic(staticRes);
      const malwareType = emulator.determineMalwareType(staticRes);
      const plan = emulator.buildExecutionPlan(staticRes.indicators || {}, staticRes.findings || [], malwareType);

      // Collect simulated events
      const events = [];
      for (const stage of plan) {
        for (const ev of stage.events) {
          events.push(ev);
        }
      }

      const behavDet = detector.evaluateBehavioral(events, malwareType);
      const combined = detector.combineResults(staticDet, behavDet);

      const displayName = `${cat.slice(3)}/${file}`;
      console.log(
        displayName.padEnd(35) +
        staticRes.fileInfo.fileType.padEnd(12) +
        String(staticDet.riskScore).padEnd(9) +
        String(behavDet.riskScore).padEnd(9) +
        String(combined.riskScore).padEnd(9) +
        combined.verdict.padEnd(11) +
        malwareType
      );
    }
  }
  console.log('='.repeat(95));
}

testAll().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
