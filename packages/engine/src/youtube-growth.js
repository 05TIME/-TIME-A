const DEFAULT_PILLARS = Object.freeze([
  { id:'african-affairs', label:'African affairs & accountability', weight:0.30 },
  { id:'history-culture', label:'African history & culture', weight:0.20 },
  { id:'business-innovation', label:'Business, economy & innovation', weight:0.20 },
  { id:'technology-futures', label:'Technology & future-facing ideas', weight:0.15 },
  { id:'people-podcasts', label:'People, interviews & podcasts', weight:0.15 },
]);

function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }

function scoreContentIdea(idea={}){
  const weights={audienceFit:0.30,demand:0.25,distinctiveness:0.20,freshness:0.15,productionFeasibility:0.10};
  const values=Object.keys(weights).reduce((out,key)=>({...out,[key]:clamp(Number(idea[key]??0),0,10)}),{});
  const score=Object.entries(weights).reduce((sum,[key,weight])=>sum+values[key]*weight,0);
  return {score:Number(score.toFixed(2)),components:values,decision:score>=7.5?'PRIORITIZE':score>=5.5?'TEST':'BACKLOG'};
}

function choosePublishingCadence(metrics={}){
  const impressions=Number(metrics.impressions||0);
  const ctr=Number(metrics.ctr||0);
  const avgViewDuration=Number(metrics.averageViewDurationSeconds||0);
  const retention=Number(metrics.averagePercentageViewed||0);
  const returningViewerShare=Number(metrics.returningViewerShare||0);
  const sampleReady=impressions>=1000;
  const enoughRetention=avgViewDuration>=45 || retention>=0.30;
  const healthyCtr=sampleReady && ctr>=0.045;
  const strongAudience=returningViewerShare>=0.12;
  let shortsPerWeek=3;
  let longVideosPerWeek=1;
  if(sampleReady && healthyCtr && enoughRetention && strongAudience){
    shortsPerWeek=5; longVideosPerWeek=2;
  } else if(sampleReady && ctr<0.025){
    shortsPerWeek=3; longVideosPerWeek=1;
  } else if(!sampleReady || !enoughRetention){
    shortsPerWeek=3; longVideosPerWeek=1;
  }
  return {
    shortsPerWeek,
    longVideosPerWeek,
    reviewAfterDays:14,
    confidence:sampleReady?'PROVISIONAL':'LOW_SAMPLE',
    rationale:!sampleReady?'Keep a sustainable test cadence until enough impressions accumulate.':!enoughRetention?'Prioritize stronger openings and retention before increasing volume.':!healthyCtr?'Improve title/thumbnail packaging before scaling output.':!strongAudience?'Build repeat-viewer habits before increasing production load.':'Increase output cautiously because packaging, retention and returning-viewer signals are healthy.',
  };
}

function buildWeeklyContentMix(pillars=DEFAULT_PILLARS){
  return pillars.map(p=>({...p,weeklyTarget:Math.max(1,Math.round(p.weight*10))}));
}

function createContentPipeline(ideaId){
  if(!ideaId) throw new Error('ideaId is required');
  return [
    {key:'research',requiresApproval:false},
    {key:'script-and-packaging',requiresApproval:false,dependsOn:'research'},
    {key:'fact-and-rights-review',requiresApproval:false,dependsOn:'script-and-packaging'},
    {key:'human-content-approval',requiresApproval:true,dependsOn:'fact-and-rights-review'},
    {key:'private-upload',requiresApproval:false,dependsOn:'human-content-approval'},
    {key:'publish-or-schedule',requiresApproval:true,dependsOn:'private-upload'},
    {key:'analytics-review',requiresApproval:false,dependsOn:'publish-or-schedule'},
  ].map(step=>({...step,ideaId}));
}

module.exports={DEFAULT_PILLARS,scoreContentIdea,choosePublishingCadence,buildWeeklyContentMix,createContentPipeline};
