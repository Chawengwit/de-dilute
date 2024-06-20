<template>
  <div id="footerZone">
    <div class="footer">
      <div class="inner">
        
        <router-link class="footer-brand-name" to="/">DeDilute</router-link>
        
        <div class="hastag">#Lorem ipsum dolor sit, amet #consectetur</div>
        <div class="social-list">


          <a class="facebook" href="http://www.facebook.com/Chawengwit" target="_blank" >
            <font-awesome-icon :icon="['fab', 'facebook-f']" />
          </a>

          <a class="instagram" href="http://www.facebook.com/Chawengwit" target="_blank" >
            <font-awesome-icon :icon="['fab', 'instagram']" />
          </a>

          <a class="tiktok" href="http://www.facebook.com/Chawengwit" target="_blank" >
            <font-awesome-icon :icon="['fab', 'tiktok']" />
          </a>

        </div>
        <div class="copy-right">Cpoyright by PanChanRon Global</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
    name: "FooterZone"
}
</script>

<style>
  .footer{
    width: 100%;
    height: 30vh;
    background: linear-gradient(var(--light-blue), var(--pink));

    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--white-bg);

    position: absolute;
    bottom: 0;
  }

  .inner{
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .footer-brand-name{
    color: var(--white-bg);
    font-size: 4vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    margin-bottom: 20px;
  }

  .social-list{
    display: flex;
    gap: 30px;
    margin: 10px 0;
  }

 .social-list a{
    color: var(--white-bg);
    font-size: 32px;
    line-height: 1.2;
  }

  .social-list path {
    transition: all 0.2s ease;
  }

  .facebook:hover path{
    fill: #1877f2
  }

  .instagram:hover path {
    fill: #d62976;
  }

  .tiktok:hover path {
    fill: #040404;
  }

  

  .copy-right{
    font-size: 12px;
    position: absolute;
    bottom: 0;
    margin-bottom: 10px;
  }

</style>