const SHEET_USERS='Users',SHEET_QRS='QR_Codes',OTP_MINUTES=10,SESSION_DAYS=30;
function doGet(){return json_({ok:true,service:'QR Forever API v2'});}
function doPost(e){try{const b=JSON.parse(e.postData.contents||'{}');if(b.action==='requestOtp')return json_(requestOtp_(b));if(b.action==='verifyOtp')return json_(verifyOtp_(b));if(b.action==='saveQr')return json_(saveQr_(b));if(b.action==='listQr')return json_(listQr_(b));throw new Error('Unknown action');}catch(err){return json_({ok:false,error:err.message});}}
function setup(){const ss=SpreadsheetApp.getActiveSpreadsheet();ensureSheet_(ss,SHEET_USERS,['email','otp_hash','otp_expires_at','session_hash','session_expires_at','created_at','last_login','full_name','department','office_name','status']);ensureSheet_(ss,SHEET_QRS,['id','owner_email','name','content','dark_color','light_color','has_logo','created_at','updated_at']);PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',ss.getId());return 'พร้อมใช้งาน: '+ss.getUrl();}
function requestOtp_(b){
  const email=String(b.email||'').trim().toLowerCase(),mode=String(b.mode||'login');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('อีเมลไม่ถูกต้อง');
  const domains=String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAIL_DOMAINS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(domains.length&&!domains.includes(email.split('@')[1]))throw new Error('กรุณาใช้อีเมลของสำนักงาน');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const sh=getSheet_(SHEET_USERS),row=findRow_(sh,1,email);
    if(mode==='login'&&!row)throw new Error('ยังไม่พบบัญชี กรุณาเลือกสมัครสมาชิก');
    if(mode==='register'&&row&&String(sh.getRange(row,11).getValue())==='active')throw new Error('อีเมลนี้สมัครแล้ว กรุณาเลือกเข้าสู่ระบบ');
    const fullName=String(b.fullName||'').trim(),department=String(b.department||'').trim(),officeName=String(b.officeName||'').trim();
    if(mode==='register'&&(!fullName||!department||!officeName))throw new Error('กรุณากรอกข้อมูลบุคลากรให้ครบ');
    const otp=String(Math.floor(100000+Math.random()*900000)),now=new Date(),expires=new Date(now.getTime()+OTP_MINUTES*60000);
    if(row){sh.getRange(row,2,1,2).setValues([[hash_(otp),expires]]);if(mode==='register')sh.getRange(row,8,1,4).setValues([[fullName,department,officeName,'pending']]);}
    else sh.appendRow([email,hash_(otp),expires,'','',now,'',fullName,department,officeName,'pending']);
    MailApp.sendEmail({to:email,subject:'รหัสยืนยัน QR Forever',htmlBody:'<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h2 style="color:#174b43">QR Forever</h2><p>รหัสยืนยันของคุณคือ</p><div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#174b43">'+otp+'</div><p>รหัสนี้มีอายุ '+OTP_MINUTES+' นาที</p></div>'});
    return{ok:true};
  }finally{lock.releaseLock();}
}
function verifyOtp_(b){const email=String(b.email||'').trim().toLowerCase(),otp=String(b.otp||''),sh=getSheet_(SHEET_USERS),row=findRow_(sh,1,email);if(!row)throw new Error('ไม่พบคำขอรหัส');const data=sh.getRange(row,1,1,11).getValues()[0];if(new Date(data[2]).getTime()<Date.now())throw new Error('รหัสหมดอายุ กรุณาขอใหม่');if(data[1]!==hash_(otp))throw new Error('รหัสไม่ถูกต้อง');const token=Utilities.getUuid()+Utilities.getUuid(),expires=new Date(Date.now()+SESSION_DAYS*86400000);sh.getRange(row,2,1,6).setValues([['','',hash_(token),expires,data[5]||new Date(),new Date()]]);sh.getRange(row,11).setValue('active');return{ok:true,token,email,fullName:data[7]||email};}
function saveQr_(b){const email=auth_(b.token),sh=getSheet_(SHEET_QRS),now=new Date(),id=Utilities.getUuid();sh.appendRow([id,email,String(b.name||'ไม่มีชื่อ').slice(0,80),String(b.content||'').slice(0,4000),String(b.darkColor||'#173d37'),String(b.lightColor||'#ffffff'),Boolean(b.hasLogo),now,now]);return{ok:true,id};}
function listQr_(b){const email=auth_(b.token),rows=getSheet_(SHEET_QRS).getDataRange().getValues();return{ok:true,items:rows.slice(1).filter(r=>r[1]===email).map(r=>({id:r[0],name:r[2],content:r[3],darkColor:r[4],lightColor:r[5],hasLogo:r[6],createdAt:r[7]}))};}
function auth_(token){if(!token)throw new Error('กรุณาเข้าสู่ระบบ');const rows=getSheet_(SHEET_USERS).getDataRange().getValues(),hash=hash_(String(token));for(let i=1;i<rows.length;i++)if(rows[i][3]===hash&&new Date(rows[i][4]).getTime()>Date.now()&&rows[i][10]==='active')return rows[i][0];throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');}
function getSheet_(name){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('ยังไม่ได้ตั้งค่าฐานข้อมูล กรุณารัน setup()');return SpreadsheetApp.openById(id).getSheetByName(name);}
function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]:[];headers.forEach((header,index)=>{if(current[index]!==header)sh.getRange(1,index+1).setValue(header);});sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#174b43').setFontColor('#ffffff');sh.setFrozenRows(1);sh.autoResizeColumns(1,headers.length);return sh;}
function findRow_(sh,col,value){if(sh.getLastRow()<2)return 0;const f=sh.getRange(2,col,sh.getLastRow()-1,1).createTextFinder(value).matchEntireCell(true).findNext();return f?f.getRow():0;}
function hash_(value){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8);return bytes.map(b=>(b+256)%256).map(b=>('0'+b.toString(16)).slice(-2)).join('');}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
