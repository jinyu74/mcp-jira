import('dotenv').then(dotenv => {
  dotenv.config({ path: '.env' });
  
  const jiraUrl = process.env.JIRA_URL;
  const jiraToken = process.env.JIRA_TOKEN;
  
  const auth = Buffer.from('placeholder:' + jiraToken).toString('base64');
  
  const jql = 'project = TECG AND reporter = currentUser() AND statusCategory != Done';
  const url = `${jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`;
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/json'
    }
  }).then(r => r.json()).then(data => {
    if (data.issues && data.issues.length > 0) {
      console.log(`✅ ${data.issues.length}개의 미완료 이슈 found:\n`);
      data.issues.forEach(i => {
        console.log(`📌 ${i.key}: ${i.fields.summary}`);
        console.log(`   상태: ${i.fields.status?.name}`);
        console.log(`   담당자: ${i.fields.assignee?.displayName || '미할당'}`);
        console.log(`   우선순위: ${i.fields.priority?.name}`);
        console.log(`   생성일: ${i.fields.created}\n`);
      });
    } else if (data.issues && data.issues.length === 0) {
      console.log('✅ 미완료 이슈가 없습니다!');
    } else {
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  }).catch(e => console.error('❌ Error:', e.message));
}).catch(e => console.error('❌ Import error:', e.message));
