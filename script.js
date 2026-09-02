const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const letterModal = $("#letterModal");
const questionModal = $("#questionModal");
const envelope = $("#letterEnvelope");
const toast = $("#toast");

function showToast(message){
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>toast.classList.remove("show"),2200);
}

function showModal(modal){
  if(!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function hideModal(modal){
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  if(!$(".modal.show")) document.body.style.overflow="";
}

/* =========================================================
   MÚSICA DE YOUTUBE
   Video: https://www.youtube.com/watch?v=p_CtUCig6LQ
   ========================================================= */
const YOUTUBE_VIDEO_ID = "p_CtUCig6LQ";
let youtubePlayer = null;
let youtubeReady = false;

function ensureYouTubeContainer(){
  let host = $("#youtubePlayer");
  if(!host){
    host = document.createElement("div");
    host.id = "youtubePlayer";
    host.setAttribute("aria-hidden","true");
    Object.assign(host.style,{position:"fixed",width:"2px",height:"2px",left:"-20px",top:"-20px",opacity:"0.01",pointerEvents:"none"});
    document.body.appendChild(host);
  }
  return host;
}

function createYouTubePlayer(){
  if(youtubePlayer || !window.YT || !YT.Player) return;
  ensureYouTubeContainer();
  youtubePlayer = new YT.Player("youtubePlayer",{
    width:"2",
    height:"2",
    videoId:YOUTUBE_VIDEO_ID,
    playerVars:{
      autoplay:1,
      controls:0,
      loop:1,
      playlist:YOUTUBE_VIDEO_ID,
      playsinline:1,
      rel:0,
      modestbranding:1
    },
    events:{
      onReady:(event)=>{
        youtubeReady=true;
        try{
          event.target.unMute();
          event.target.setVolume(75);
          event.target.playVideo();
        }catch(e){}
      }
    }
  });
}

function loadYouTubeAPI(){
  ensureYouTubeContainer();
  if(window.YT && window.YT.Player){ createYouTubePlayer(); return; }
  if(document.getElementById("youtube-iframe-api")) return;
  const tag=document.createElement("script");
  tag.id="youtube-iframe-api";
  tag.src="https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady=createYouTubePlayer;
}

function tryStartMusic(){
  if(!youtubePlayer || !youtubeReady) return;
  try{
    youtubePlayer.unMute();
    youtubePlayer.setVolume(75);
    youtubePlayer.playVideo();
  }catch(e){}
}
loadYouTubeAPI();
document.addEventListener("pointerdown",tryStartMusic,{once:true,passive:true});

/* =========================================================
   PORTADA
   ========================================================= */
$("#openGiftBtn")?.addEventListener("click",()=>{
  tryStartMusic();
  document.querySelector(".memory-section")?.scrollIntoView({behavior:"smooth"});
  burstHearts(18);
});

/* =========================================================
   CARTA
   ========================================================= */
function openLetter(){
  envelope?.classList.add("open");
  tryStartMusic();
  setTimeout(()=>showModal(letterModal),260);
}
$("#openLetterBtn")?.addEventListener("click",openLetter);
envelope?.addEventListener("click",openLetter);
envelope?.addEventListener("keydown",(e)=>{
  if(e.key==="Enter" || e.key===" ") openLetter();
});
$("#closeLetterBtn")?.addEventListener("click",()=>hideModal(letterModal));
$("#closeQuestionBtn")?.addEventListener("click",()=>hideModal(questionModal));
$$('.modal-backdrop').forEach(el=>el.addEventListener('click',()=>hideModal(el.parentElement)));

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape"){
    hideModal(letterModal);
    hideModal(questionModal);
  }
});

/* =========================================================
   PERSISTENCIA DE PLANES
   No necesitas modificar los botones del HTML.
   Se les asigna un ID estable por posición y se guardan en
   localStorage. Permanecen marcados al volver al navegador.
   ========================================================= */
const STORAGE_KEY = "regalo_digital_bucket_items_v2";
const bucketButtons = $$(".bucket-item");

function getSavedBucketItems(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    const parsed=raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){ return []; }
}
function saveBucketItems(ids){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify([...new Set(ids)])); }catch(e){}
}
function getBucketId(btn,index){
  if(btn.dataset.id) return btn.dataset.id;
  const normalized=(btn.textContent||"").trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9áéíóúüñ_-]/gi,"");
  return normalized ? `${index}-${normalized}` : `item-${index}`;
}

function restoreBucketItems(){
  const saved=new Set(getSavedBucketItems());
  bucketButtons.forEach((btn,index)=>{
    const id=getBucketId(btn,index);
    btn.dataset.persistenceId=id;
    if(saved.has(id)) btn.classList.add("done");
  });
}

bucketButtons.forEach((btn,index)=>{
  btn.addEventListener("click",()=>{
    const id=btn.dataset.persistenceId || getBucketId(btn,index);
    const saved=new Set(getSavedBucketItems());
    if(saved.has(id)){
      saved.delete(id);
      btn.classList.remove("done");
      showToast("Marcado como pendiente");
    }else{
      saved.add(id);
      btn.classList.add("done");
      showToast("Marcado como hecho ✓");
    }
    saveBucketItems([...saved]);
  });
});
restoreBucketItems();

/* =========================================================
   VALES — comportamiento existente
   ========================================================= */
$$('.coupon-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(btn.classList.contains('redeemed')) return;
    btn.classList.add('redeemed');
    btn.textContent='Canjeado ✓';
    btn.closest('.coupon').style.opacity='.78';
    showToast('Vale canjeado una sola vez ✓');
  });
});

/* =========================================================
   PREGUNTA FINAL — SÍ / NO
   El NO se escapa, se hace pequeño y transfiere su tamaño al SÍ
   ========================================================= */

const finalChoice = $(".question-actions");
const finalYesBtn = $("#yesBtn");
const finalNoBtn = $("#noBtn");

let noAttempts = 0;

const MAX_NO_ATTEMPTS = 7;

function moveNoButton(){

  if(!finalChoice || !finalNoBtn || !finalYesBtn) return;

  noAttempts++;

  /*
   * Cada intento reduce NO
   * y aumenta SÍ.
   */

  const noScale = Math.max(
    0.16,
    1 - (noAttempts * 0.12)
  );

  const yesScale =
    1 + (noAttempts * 0.11);

  const paddingScale =
    Math.max(
      0.45,
      1 - (noAttempts * 0.08)
    );

  const fontScale =
    Math.max(
      0.60,
      1 - (noAttempts * 0.06)
    );

  /*
   * Movimiento aleatorio.
   */

  const maxX = Math.max(
    35,
    finalChoice.clientWidth / 2 - 70
  );

  const maxY = 45;

  const x =
    (Math.random() * 2 - 1) * maxX;

  const y =
    (Math.random() * 2 - 1) * maxY;

  finalNoBtn.style.transform =
    `translate(${x}px, ${y}px) scale(${noScale})`;

  /*
   * También reducimos físicamente el tamaño
   * del botón NO.
   */

  finalNoBtn.style.padding =
    `${13 * paddingScale}px ${20 * paddingScale}px`;

  finalNoBtn.style.fontSize =
    `${100 * fontScale}%`;

  /*
   * El tamaño perdido pasa al SÍ.
   */

  finalYesBtn.style.transform =
    `scale(${yesScale})`;

  finalYesBtn.style.boxShadow =
    `0 ${12 + noAttempts * 2}px
     ${30 + noAttempts * 4}px
     rgba(36,88,59,.30)`;

  const messages = [
    "Ese NO se está escapando 😏",
    "¡Casi lo tienes! ❤️",
    "El SÍ está creciendo...",
    "Ese botón ya está entrando en pánico 😂",
    "Cada vez queda menos NO ❤️",
    "El universo claramente quiere un SÍ 😌",
    "Creo que ese NO ya perdió 😂❤️"
  ];

  showToast(
    messages[
      Math.min(
        noAttempts - 1,
        messages.length - 1
      )
    ]
  );

  /*
   * Después de varios intentos,
   * NO prácticamente desaparece.
   */

  if(noAttempts >= MAX_NO_ATTEMPTS){

    finalChoice.classList.add("no-finished");

    finalNoBtn.style.transform =
      "scale(.08)";

    finalNoBtn.style.opacity =
      ".08";

    finalNoBtn.style.pointerEvents =
      "none";

    finalYesBtn.style.transform =
      "scale(1.95)";

    burstHearts(30);

    showToast(
      "Ese NO se rindió 😂❤️"
    );
  }
}


/*
 * Cuando intenta pasar el cursor sobre NO
 */

finalNoBtn?.addEventListener(
  "mouseenter",
  moveNoButton
);


/*
 * En teléfonos/tablets
 */

finalNoBtn?.addEventListener(
  "touchstart",
  (event)=>{

    event.preventDefault();

    moveNoButton();

  },
  {passive:false}
);


/*
 * Si llega a enfocarse con teclado
 */

finalNoBtn?.addEventListener(
  "focus",
  moveNoButton
);


/*
 * Por seguridad, también interceptamos click.
 */

finalNoBtn?.addEventListener(
  "click",
  (event)=>{

    event.preventDefault();

    moveNoButton();

  }
);


/*
 * SÍ
 */

finalYesBtn?.addEventListener(
  "click",
  ()=>{

    finalChoice?.classList.add(
      "no-finished"
    );

    finalNoBtn.style.transform =
      "scale(.05)";

    finalNoBtn.style.opacity =
      ".05";

    finalNoBtn.style.pointerEvents =
      "none";

    finalYesBtn.style.transform =
      "scale(1.95)";

    burstHearts(42);

    showToast(
      "¡Sabía que elegirías el SÍ! ❤️"
    );

    showModal(questionModal);
  }
);

/* =========================================================
   ANIMACIONES
   ========================================================= */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    }
  });
},{threshold:.12});
$$('.reveal').forEach(el=>io.observe(el));

function burstHearts(count=20){
  const host=$("#hearts");
  if(!host) return;
  for(let i=0;i<count;i++){
    const h=document.createElement('span');
    h.className='floating-heart';
    h.textContent=Math.random()>.25?'♥':'♡';
    h.style.left=(10+Math.random()*80)+'%';
    h.style.fontSize=(12+Math.random()*22)+'px';
    h.style.animationDuration=(3.5+Math.random()*3)+'s';
    h.style.animationDelay=(Math.random()*.6)+'s';
    host.appendChild(h);
    setTimeout(()=>h.remove(),7200);
  }
}
setInterval(()=>burstHearts(2),5000);
burstHearts(6);

/* =========================================================
   CONFIGURACIÓN EXISTENTE
   ========================================================= */
const config={
  recipient:'Esperanza',
  sender:'Franklin',
  place:'Nuestro lugar',
  question:'¿Quieres seguir escribiendo nuestra historia conmigo? ❤️',
  finalTitle:'Por todo lo que somos.',
  finalText:'Gracias por formar parte de tantos buenos momentos.'
};

$("#recipientName") && ($("#recipientName").textContent=config.recipient);
$("#senderName") && ($("#senderName").textContent=config.sender);
$("#letterSigner") && ($("#letterSigner").textContent=config.sender);
$("#placeText") && ($("#placeText").dataset.place=config.place);
$("#questionTitle") && ($("#questionTitle").textContent=config.question);
$("#finalTitle") && ($("#finalTitle").textContent=config.finalTitle);
$("#finalText") && ($("#finalText").textContent=config.finalText);
