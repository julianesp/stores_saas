// Script para verificar la configuración del producto Huevo
const API_URL = 'http://localhost:3001/api/products';

async function checkHuevoProduct() {
  try {
    console.log('🔍 Consultando productos...\n');

    const response = await fetch(API_URL);
    const products = await response.json();

    // Buscar productos que contengan "huevo" en el nombre
    const huevoProducts = products.filter(p =>
      p.name.toLowerCase().includes('huevo')
    );

    if (huevoProducts.length === 0) {
      console.log('❌ No se encontró ningún producto con "huevo" en el nombre\n');
      return;
    }

    console.log(`✅ Encontrados ${huevoProducts.length} producto(s) con "huevo":\n`);

    huevoProducts.forEach(product => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 PRODUCTO:', product.name);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', product.id);
      console.log('Stock actual:', product.stock);
      console.log('Vende por unidad:', product.sell_by_unit);
      console.log('Unidades por paquete:', product.units_per_package);
      console.log('Nombre de unidad:', product.unit_name);
      console.log('Nombre de paquete:', product.package_name);
      console.log('Precio por unidad:', product.price_per_unit);
      console.log('Precio de venta (paquete):', product.sale_price);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Análisis
      console.log('📊 ANÁLISIS:');
      if (product.sell_by_unit) {
        const unitsPerPackage = product.units_per_package || 1;

        // Calcular unidades totales disponibles según diferentes interpretaciones
        const interpretation1 = product.stock; // Stock en unidades
        const interpretation2 = product.stock * unitsPerPackage; // Stock en paquetes

        console.log(`\n🔹 Si stock está en UNIDADES INDIVIDUALES:`);
        console.log(`   → Stock: ${interpretation1} unidades`);
        console.log(`   → Paquetes completos: ${Math.floor(interpretation1 / unitsPerPackage)}`);
        console.log(`   → Unidades sueltas: ${interpretation1 % unitsPerPackage}`);

        console.log(`\n🔹 Si stock está en PAQUETES:`);
        console.log(`   → Stock: ${product.stock} paquetes`);
        console.log(`   → Equivale a: ${interpretation2} unidades`);
        console.log(`   → Paquetes completos: ${Math.floor(product.stock)}`);
        console.log(`   → Unidades sueltas: ${(product.stock % 1) * unitsPerPackage}`);
      } else {
        console.log('   Este producto NO se vende por unidades');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkHuevoProduct();
