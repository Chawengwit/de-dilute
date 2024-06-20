<template>
  <div id="headerZone">
    <HamMenu/>
    <div class="header">
      <div class="inner">
        <router-link class="logo-brand" to="/">
          <img src="../assets/brand/dedilute_Banner.PNG" alt="">
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import HamMenu from './HamMenu.vue';
export default {
    name: "HeaderZone",
    components: {
      HamMenu
    }
}
</script>
  
<style>
  .header {
    width: 100%;
    height: 30vh;
    background: linear-gradient(to right top, var(--green)25%, var(--light-green) 50%,  var(--green-yellow) 75% );
    padding-left: 40px;

    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .logo-brand{
    width: 300px;
  }
  
  img{
    width: 100%;
    object-fit: contain;
  }

</style>