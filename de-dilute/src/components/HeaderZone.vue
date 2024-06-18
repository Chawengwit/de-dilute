<template>
  <div id="headerZone">
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
export default {
    name: "HeaderZone"
}
</script>
  
<style>
  .header {
    width: 100%;
    height: 30vh;
    background-color: var(--light-green);
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