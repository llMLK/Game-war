'use strict';
// Campaign atlas, 715 CE. Coordinates are a readable geographic projection,
// not surveyed borders. Historical scope and disputed sites: docs/world-research.md.
const WEST_ATLAS = (() => {
  const project = (lon, lat) => [Math.round(80 + (lon + 10) * 30), Math.round(80 + (48 - lat) * 32)];
  // id, name, longitude, latitude, owner, population scale, walls, terrain, region, resource
  const rows = [
    ['constantinople','القسطنطينية',28.97,41.01,'byzantine',40000,4,'coast','الروم','harbor'],
    ['nicaea','نيقية',29.72,40.43,'byzantine',16000,2,'hills','الروم','craft'],
    ['amorium','عمورية',30.54,39.03,'byzantine',20000,2,'plains','الأناضول','grain'],
    ['ancyra','أنقرة',32.86,39.93,'byzantine',14000,2,'hills','الأناضول','craft'],
    ['caesarea','قيصرية',35.48,38.72,'byzantine',15000,2,'mountains','الأناضول','craft'],
    ['trebizond','طرابزون',39.72,41.01,'byzantine',12000,2,'coast','البحر الأسود','harbor'],
    ['tarsus','طرسوس',34.89,36.92,'umayyad',8000,1,'coast','الثغور','harbor'],
    ['malatya','ملطية',38.31,38.35,'umayyad',11000,2,'hills','الثغور','grain'],
    ['antioch','أنطاكية',36.16,36.2,'umayyad',22000,2,'river','الشام','craft'],
    ['aleppo','حلب',37.16,36.21,'umayyad',20000,2,'plains','الشام','silk'],
    ['damascus','دمشق',36.28,33.51,'umayyad',36000,3,'plains','الشام','silk'],
    ['palmyra','تدمر',38.27,34.56,'umayyad',7000,1,'desert','الشام','oasis'],
    ['raqqa','الرقة',39.01,35.95,'umayyad',13000,1,'river','الجزيرة','grain'],
    ['mosul','الموصل',43.12,36.34,'umayyad',18000,2,'river','الجزيرة','grain'],
    ['kufa','الكوفة',44.4,32.03,'umayyad',26000,2,'river','العراق','grain'],
    ['dvin','دبيل',44.58,40,'umayyad',13000,2,'mountains','القوقاز','craft'],
    ['tiflis','تفليس',44.8,41.71,'neutral',12000,2,'forest','القوقاز','craft'],
    ['cherson','خرسون',33.48,44.61,'byzantine',10000,2,'coast','البحر الأسود','harbor'],
    ['derbent','باب الأبواب',48.29,42.05,'umayyad',11000,3,'mountains','القوقاز','pass'],
    ['balanjar','بلنجر',47.1,43.14,'khazar',24000,2,'hills','الخزر','herds'],
    ['samandar','سمندر',47.5,42.7,'khazar',12000,1,'coast','الخزر','herds'],
    ['atil','معبر الفولغا',48.04,46.35,'khazar',8000,0,'river','الخزر','herds'],
    ['iconium','قونية',32.48,37.87,'byzantine',14000,2,'hills','الأناضول','grain'],
    ['attalia','أنطالية',30.7,36.89,'byzantine',16000,2,'coast','الأناضول','harbor'],
    ['smyrna','إزمير',27.14,38.42,'byzantine',18000,2,'coast','الروم','harbor'],
    ['ephesus','أفسس',27.34,37.94,'byzantine',13000,2,'hills','الروم','craft'],
    ['sinope','سينوب',35.15,42.03,'byzantine',12000,2,'coast','البحر الأسود','harbor'],
    ['adrianople','أدرنة',26.56,41.68,'byzantine',16000,2,'plains','الروم','grain'],
    ['thessalonica','تسالونيكي',22.94,40.64,'byzantine',25000,3,'coast','الروم','harbor'],
    ['athens','أثينا',23.72,37.98,'byzantine',12000,2,'hills','الروم','craft'],
    ['corinth','قورنثوس',22.93,37.91,'byzantine',14000,2,'coast','الروم','harbor'],
    ['syracuse','سرقوسة',15.29,37.07,'byzantine',20000,3,'coast','صقلية','harbor'],
    ['caralis','قراليس',9.12,39.22,'byzantine',11000,2,'coast','سردانية','harbor'],
    ['cyprus','قبرص',33.2,35.1,'neutral',15000,2,'coast','قبرص','harbor'],
    ['homs','حمص',36.71,34.73,'umayyad',18000,2,'plains','الشام','grain'],
    ['tartus','طرطوس',35.89,34.89,'umayyad',10000,1,'coast','الشام','harbor'],
    ['jerusalem','بيت المقدس',35.23,31.78,'umayyad',22000,2,'hills','فلسطين','craft'],
    ['ramla','الرملة',34.86,31.93,'umayyad',14000,1,'plains','فلسطين','grain'],
    ['aqaba','أيلة',35.01,29.53,'umayyad',8000,1,'coast','الحجاز','harbor'],
    ['pelusium','الفرما',32.54,31.04,'umayyad',10000,2,'coast','مصر','harbor'],
    ['fustat','الفسطاط',31.23,30.01,'umayyad',34000,2,'river','مصر','grain'],
    ['alexandria','الإسكندرية',29.92,31.2,'umayyad',30000,3,'coast','مصر','harbor'],
    ['aswan','أسوان',32.9,24.09,'umayyad',11000,1,'river','مصر','grain'],
    ['dongola','دنقلا',30.48,18.23,'neutral',17000,2,'river','النوبة','grain'],
    ['barqa','برقة',20.83,32.49,'umayyad',12000,1,'hills','إفريقية','herds'],
    ['tripoli','طرابلس الغرب',13.19,32.89,'umayyad',16000,2,'coast','إفريقية','harbor'],
    ['kairouan','القيروان',10.1,35.68,'umayyad',24000,2,'plains','إفريقية','grain'],
    ['tunis','تونس',10.17,36.8,'umayyad',15000,2,'coast','إفريقية','harbor'],
    ['tlemcen','تلمسان',-1.32,34.88,'umayyad',14000,2,'hills','المغرب','herds'],
    ['tangier','طنجة',-5.8,35.78,'umayyad',16000,2,'coast','المغرب','harbor'],
    ['volubilis','وليلي',-5.56,34.07,'neutral',8000,1,'hills','المغرب','herds'],
    ['sevilla','إشبيلية',-5.98,37.39,'umayyad',20000,2,'river','الأندلس','grain'],
    ['cordoba','قرطبة',-4.78,37.89,'umayyad',22000,2,'river','الأندلس','craft'],
    ['toledo','طليطلة',-4.02,39.86,'umayyad',18000,3,'hills','الأندلس','craft'],
    ['merida','ماردة',-6.34,38.92,'umayyad',16000,2,'river','الأندلس','grain'],
    ['zaragoza','سرقسطة',-.89,41.65,'umayyad',16000,2,'river','الأندلس','grain'],
    ['barcelona','برشلونة',2.17,41.39,'neutral',12000,2,'coast','الثغر الغربي','harbor'],
    ['narbonne','أربونة',3,43.18,'neutral',16000,2,'coast','الثغر الغربي','harbor'],
    ['medina','المدينة',39.61,24.47,'umayyad',20000,1,'desert','الحجاز','oasis'],
    ['mecca','مكة',39.83,21.42,'umayyad',18000,1,'mountains','الحجاز','oasis'],
    ['sanaa','صنعاء',44.21,15.37,'umayyad',18000,2,'mountains','اليمن','grain'],
    ['aden','عدن',45.03,12.8,'umayyad',13000,1,'coast','اليمن','harbor'],
    ['basra','البصرة',47.78,30.5,'umayyad',25000,2,'river','العراق','harbor'],
    ['wasit','واسط',45.84,32.5,'umayyad',18000,2,'river','العراق','grain'],
    ['hajar','هجر',49.6,25.38,'umayyad',10000,1,'desert','البحرين','oasis'],
    ['alania','مضيق الداريال',44.63,42.73,'neutral',8000,2,'mountains','القوقاز','pass'],
  ];
  const resources = {
    grain: { name: 'سهول الحبوب', food: 1.35, market: .9 },
    harbor: { name: 'مرفأ تجاري', food: .8, market: 1.25 },
    craft: { name: 'حرف وصناعات', food: 1, market: 1.2 },
    silk: { name: 'نسيج وتجارة', food: 1, market: 1.3 },
    herds: { name: 'مراعٍ وخيول', food: 1.15, market: .9 },
    oasis: { name: 'واحة ومحطة قوافل', food: .65, market: 1.1 },
    pass: { name: 'باب الجبال', food: .75, market: 1.05 },
  };
  const nodes = rows.map(([id,name,lon,lat,owner,pop,walls,terrain,region,resource]) => {
    const [x,y] = project(lon,lat);
    return {id,name,x,y,owner,pop,walls,terrain,region,resource,capital:['constantinople','damascus','balanjar'].includes(id),port:resource==='harbor'?1:0,market:['fustat','sevilla','kairouan','syracuse','constantinople','damascus','balanjar'].includes(id)?1:0};
  });
  // Close cities get cartographic offsets; their geographic relationship is retained.
  const offsets = { nicaea:[18,15], ephesus:[12,24], corinth:[-18,12], aleppo:[23,-8], antioch:[-12,-8], tartus:[-18,-2], homs:[20,12], ramla:[-8,4], jerusalem:[15,20], samandar:[28,15], balanjar:[-10,-15], tarsus:[-10,-8], kairouan:[-12,10], cordoba:[16,10] };
  for(const n of nodes) if(offsets[n.id]) {n.x+=offsets[n.id][0];n.y+=offsets[n.id][1];}
  // Coastal symbols use the nearest dry anchor after display offsets, not an offshore label position.
  const dry=(x,y)=>ATLAS_LAND.some(p=>x>=p.bounds[0]&&y>=p.bounds[1]&&x<=p.bounds[2]&&y<=p.bounds[3]&&pip(p.rings[0],x,y)&&!p.rings.slice(1).some(r=>pip(r,x,y)));
  for(const n of nodes)if(!dry(n.x,n.y)){
    let anchor=null;
    for(let radius=2;radius<=40&&!anchor;radius+=2)for(let k=0;k<48;k++){
      const x=Math.round(n.x+Math.cos(k*Math.PI/24)*radius),y=Math.round(n.y+Math.sin(k*Math.PI/24)*radius);
      if([[0,0],[2,0],[-2,0],[0,2],[0,-2]].every(([dx,dy])=>dry(x+dx,y+dy))){anchor=[x,y];break;}
    }
    if(anchor)[n.x,n.y]=anchor;
  }
  for(const n of nodes) if(['sevilla','athens','ephesus','nicaea'].includes(n.id))n.port=1; // River port or the regional sea landing.
  nodes.find(n=>n.id==='nicaea').landing=project(28.95,40.43); // Cius/Gemlik landing for inland Nicaea.
  nodes.find(n=>n.id==='nicaea').context='مدينة داخلية؛ الاتصال البحري عبر مرفأ كيوس على خليج مرمرة.';
  nodes.find(n=>n.id==='sevilla').landing=project(-6.35,36.85); // Guadalquivir river access.
  nodes.find(n=>n.id==='sevilla').context='الاتصال البحري عبر مصب الوادي الكبير، ثم الطريق النهري إلى المدينة.';
  nodes.find(n=>n.id==='cyprus').context='جزيرة ذات اتفاق جباية مشتركة بين دمشق والقسطنطينية؛ تمثل هنا إدارة محلية.';
  nodes.find(n=>n.id==='derbent').context='ثغر استُعيد حديثاً، يحرس الممر الضيق بين الجبل وبحر الخزر.';
  const chains = [
    'merida sevilla cordoba toledo zaragoza barcelona narbonne','merida toledo',
    'tangier tlemcen kairouan tunis','tangier volubilis tlemcen','kairouan tripoli barqa alexandria fustat pelusium ramla jerusalem damascus',
    'fustat aswan dongola','ramla aqaba medina mecca sanaa aden','mecca medina','aqaba damascus',
    'damascus homs aleppo antioch tarsus','homs tartus antioch','damascus palmyra raqqa mosul dvin tiflis',
    'aleppo raqqa malatya','palmyra kufa wasit basra hajar','raqqa kufa','kufa mosul',
    'nicaea amorium ancyra caesarea malatya','amorium iconium','nicaea smyrna ephesus attalia iconium',
    'ancyra sinope trebizond','ancyra trebizond','caesarea trebizond','constantinople adrianople thessalonica athens corinth',
    'balanjar samandar derbent','balanjar atil','samandar atil','cherson atil',
  ];
  const edges=[];
  const add=(a,b,kind)=>{if(!edges.some(e=>e.includes(a)&&e.includes(b)))edges.push(kind?[a,b,kind]:[a,b]);};
  for(const chain of chains){const ids=chain.split(' ');for(let i=1;i<ids.length;i++)add(ids[i-1],ids[i]);}
  for(const [a,b] of [['tarsus','iconium'],['tarsus','caesarea'],['amorium','caesarea'],['trebizond','dvin'],['dvin','derbent'],['tiflis','alania'],['alania','balanjar']])add(a,b,'pass');
  for(const [a,b] of [['constantinople','nicaea'],['tangier','sevilla'],['tunis','syracuse'],['syracuse','corinth'],['syracuse','caralis'],['caralis','barcelona'],['alexandria','cyprus'],['cyprus','tartus'],['cyprus','attalia'],['smyrna','athens'],['smyrna','constantinople'],['constantinople','cherson'],['cherson','trebizond']])add(a,b,'water');
  const poly = p=>p.map(([lon,lat])=>project(lon,lat));
  // Coastal roads follow land; drawing uses these waypoints without inventing shortcuts.
  const bends={
    'tangier|tlemcen':[[-5,35],[-3,34.9]],
    'kairouan|tripoli':[[10.3,34.8],[10.1,33.5],[11.4,32.7]],
    'tripoli|barqa':[[14.5,32.1],[15.7,31.1],[17.5,30.4],[19.4,30.2],[20.4,31.8]],
    'barqa|alexandria':[[22,32.2],[23.5,31.8],[25,31.2],[27.3,30.8],[29.1,30.6]],
    'pelusium|ramla':[[33.3,30.7],[34.1,31]],
    'basra|hajar':[[47.1,29.7],[47.4,28.4],[48.2,27.3]],
    'sinope|trebizond':[[35.3,41.5],[36.5,41],[38.2,40.7]],
    'thessalonica|athens':[[22.5,40],[22.3,39.3],[22.6,38.3]],
    'athens|corinth':[[23.4,38.1],[23,38.1]],
    'balanjar|atil':[[46.7,44],[46.6,45.3],[47.7,46]],
    'samandar|atil':[[47.4,43.3],[46.9,44.5],[46.9,45.6],[47.7,46]],
    'constantinople|nicaea':[[28.7,40.85],[28.55,40.55],[28.8,40.45]],
    'tangier|sevilla':[[-5.95,35.9],[-6.35,36.2],[-6.48,36.75]],
    'tunis|syracuse':[[11.3,36.9],[13.4,36.3],[15.45,36.55]],
    'syracuse|caralis':[[15.6,36.7],[14.8,36.25],[12,37.3],[9.4,38.8]],
    'cyprus|tartus':[[34.2,34.55],[35.4,34.5]],
    'smyrna|athens':[[26.6,38.45],[26.2,38.1],[24.8,37.7],[24.1,37.5],[23.65,37.8]],
    'antioch|tarsus':[[36.3,36.8],[35.8,37.2]],
    'cherson|atil':[[33.7,45.9],[33.8,46.5],[35,47.2],[38.7,47.5],[42,47.4],[46.7,46.4]],
    'smyrna|constantinople':[[25.7,38.7],[25.6,40.2],[27,40.6]],
    'syracuse|corinth':[[18.5,35.3],[22,36.2]],
  };
  for(const e of edges)if(bends[e[0]+'|'+e[1]])e[3]=poly(bends[e[0]+'|'+e[1]]);
  for(const e of edges)if(ATLAS_ROUTE_DRAWINGS[e[0]+'|'+e[1]])e[3]=ATLAS_ROUTE_DRAWINGS[e[0]+'|'+e[1]];
  return {width:2048,height:1280,nodes,edges,resources,land:ATLAS_LAND,
    forests:[[-6,41,26],[1,43,30],[22,41.7,28],[26,42,24],[31,41.3,27],[38,40.5,23],[43,42,30]].map(([x,y,r])=>[...project(x,y),r]),
    seas:[], islands:[], // Water is the complement of the geographic land mask.
    deserts:[poly([[-9,31],[2,32],[13,30],[24,29],[29,27],[29,18],[15,17],[0,20],[-10,25]]),poly([[36,32],[42,31],[48,29],[49,22],[46,17],[41,18],[38,23]])],
    rivers:[poly([[31,31.6],[31.2,30],[31.4,28],[32.5,26],[32.9,24],[31.5,21],[30.5,18],[32,15]]),poly([[39,39],[38.5,37.5],[39,36],[41,34],[44.4,32],[47.5,30.5]]),poly([[42,38],[43.1,36.3],[44,34],[45.8,32.5],[47.5,30.5]]),poly([[-6.4,37],[-6,37.4],[-4.8,37.9],[-3,38.2]]),poly([[46,48],[47,47],[48,46],[48.5,45]])],
    mountains:[[1,42.7],[2,42.4],[-5,34],[0,34],[6,35],[31,37.2],[33,37.5],[35,38],[40,40],[42,41.8],[44,42.8],[46,42.4],[39,22],[42,17]].map(([x,y])=>project(x,y)),
    labels:[['البحر المتوسط',17,35.5,'sea'],['البحر الأسود',34,43,'sea'],['بحر القلزم',36,24,'sea'],['بحر الخزر',51,42,'sea'],['الصحراء الكبرى',12,26,'land'],['جزيرة العرب',44,25,'land'],['الأندلس',-3,40.5,'land'],['إفريقية',7,34,'land'],['مصر',29,27,'land']].map(([text,x,y,kind])=>({text,...Object.fromEntries(project(x,y).map((v,i)=>[i?'y':'x',v])),kind})),
  };
})();
