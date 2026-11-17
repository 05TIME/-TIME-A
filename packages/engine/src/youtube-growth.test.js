const test=require('node:test');
const assert=require('node:assert/strict');
const {scoreContentIdea,choosePublishingCadence,createContentPipeline,DEFAULT_PILLARS}=require('./youtube-growth');

test('scores ideas using bounded inputs and returns a prioritization',()=>{
  const result=scoreContentIdea({audienceFit:10,demand:9,distinctiveness:8,freshness:8,productionFeasibility:9});
  assert.equal(result.decision,'PRIORITIZE');
  assert.ok(result.score<=10);
});
test('keeps a sustainable baseline when channel sample is small',()=>{
  const result=choosePublishingCadence({impressions:120,ctr:0.08});
  assert.equal(result.shortsPerWeek,3);
  assert.equal(result.confidence,'LOW_SAMPLE');
});
test('scales only when CTR, retention and returning viewers are healthy',()=>{
  const result=choosePublishingCadence({impressions:5000,ctr:0.06,averageViewDurationSeconds:90,returningViewerShare:0.2});
  assert.equal(result.shortsPerWeek,5);
  assert.equal(result.longVideosPerWeek,2);
});
test('publishing pipeline requires two distinct human approval gates',()=>{
  const steps=createContentPipeline('idea-1');
  assert.equal(steps.filter(x=>x.requiresApproval).length,2);
  assert.equal(steps.at(-1).key,'analytics-review');
});
test('editorial pillars form the five-part channel mix',()=>{
  assert.equal(DEFAULT_PILLARS.length,5);
});
