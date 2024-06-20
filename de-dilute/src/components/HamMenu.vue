<template>
  <div id="hamMenu">
    <div id="slideMenu">

        <button class="sidemenu btn" @click="navOpen =!navOpen" :class="{ active: navOpen}">
            <span class="top"></span>
            <span class="mid"></span>
            <span class="bottom"></span>
        </button>

        <transition name="translateX">
            <nav v-show="navOpen">
                <div class="sidemenu wrapper">
                    <ul class="sidemenu list">
                        <li class="sidemenu item"><a href="">Home</a></li>
                        <li class="sidemenu item"><a href="">Shop</a></li>
                        <li class="sidemenu item"><a href="">About</a></li>
                        <li class="sidemenu item"><a href="">Contact</a></li>
                    </ul>
                </div>
            </nav>
        </transition>

    </div>
  </div>
</template>

<script>

export default {
    name: "HamMenu",
    el: '#slideMenu',
   data() {
    return {
        navOpen: true,
    }
   },
}
</script>

<style>
    #slideMenu nav {
        background: var(--light-blue);
		position: absolute;
		right: 0;
		z-index: 99;
        width: 20%;
        height: 30vh;
    }
    .sidemenu.btn{
        display: block;
        position: absolute;
        right: 0;
        top: 0;
        width: 50px;
        height: 50px;
        background: transparent;
        border: none;
        z-index: 100;
        appearance: none;
        cursor: pointer;
        outline: none;
    }
    .sidemenu.btn span{
        display: block;
        width: 20px;
        height: 2px;
        margin: auto;
        background: var(--brown);
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        transition: all .4s ease;
    }
    .sidemenu.btn span.top{
        transform: translateY(-8px);
    }
    .sidemenu.btn span.bottom{
        transform: translateY(8px);
    }

    .sidemenu.btn.active .top{
        transform: rotate(-45deg);
        background: var(--white-bg);
    }

    .sidemenu.btn.active .mid{
        transform: translateX(-20px) rotate(360deg);
        opacity: 0;
    }

    .sidemenu.btn.active .bottom{
        transform: rotate(45deg);
        background: var(--white-bg);
    }

    .sidemenu.wrapper{
        padding-top: 50px;
    }

    .sidemenu.list{
        padding-top: 50px;
        list-style:none;
        padding: 0;
        margin: 0;
    }

    .sidemenu.item a{
        text-decoration: none;
        line-height: 1.2;
        font-size: 1em;
        padding: 10px 25px;
        display: block;
        color: var(--white-bg);
        transition: .4s ease;
    }

    .sidemenu.item a:hover {
        background: var(--white-bg);
        color: var(--light-blue);
    }

    .translateX-enter{
        transform:translateX(200px);
        opacity: 0;
    }

    .translateX-enter-active,.translateX-leave-active{
        transform-origin: top left 0;
        transition:.2s ease;
    }

    .translateX-leave-to{
        transform: translateX(200px);
        opacity: 0;
    }

</style>