<template>
  <div id="footerZone">
    <div class="footer">
      <div class="inner">
        <router-link class="footer-brand-name" to="/">DeDilute</router-link>
        <div class="hastag">#Lorem ipsum dolor sit, amet #consectetur adipisicing elit. #Ab, nobis?</div>
        <div class="socail-list">
          <div>IG</div>
          <div>Facebook</div>
          <div>Tiktok</div>
        </div>
        <div>Cpoyright by PanChanRon Global</div>
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
    background-color: var(--light-green);
    padding-left: 40px;

    display: flex;
    justify-content: center;
    align-items: center;
    color: #FFF;

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
    color: #FFF;
    font-size: 4vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    margin-bottom: 20px;
  }
</style>