import json
import os
from datetime import datetime
import logging
from pathlib import Path
from langchain_community.llms import Ollama
import time
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('processing.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class FileProcessor:
    def __init__(self):
        self.base_dir = Path(os.getcwd())
        self.database_dir = self.base_dir / 'app' / 'database'
        self.llm = None
        
        # Initialize data files
        self.categories_file = self.database_dir / 'arvore_categorias.json'
        self.products_file = self.database_dir / 'products.json'
        self.brands_file = self.database_dir / 'marcas.json'
        
        # Create database directory if it doesn't exist
        os.makedirs(self.database_dir, exist_ok=True)
        
        # Load or create data structures
        self.categories = self._load_or_create_categories()
        self.products = self._load_or_create_products()
        self.brands = self._load_or_create_brands()
        
        # Initialize LLM
        self._initialize_llm()

    def _initialize_llm(self):
        """Initialize the LLM with consistent parameters."""
        try:
            self.llm = Ollama(
                model="llama3",
                temperature=0.1,
                num_ctx=4096,
                top_k=10,
                top_p=0.1,
                repeat_penalty=1.2,
                stop=["\n\n", "```"]
            )
            logger.info("Successfully initialized Ollama with llama3 model")
        except Exception as e:
            error_msg = f"Failed to initialize LLM: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def _load_or_create_categories(self) -> dict:
        if self.categories_file.exists():
            with open(self.categories_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"categorias": []}

    def _load_or_create_products(self) -> dict:
        if self.products_file.exists():
            with open(self.products_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"products": []}

    def _load_or_create_brands(self) -> dict:
        """Load or create the brands file."""
        if self.brands_file.exists():
            with open(self.brands_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"marcas": []}

    def _save_categories(self):
        """Save categories to arvore_categorias.json with proper formatting."""
        try:
            with open(self.categories_file, 'w', encoding='utf-8') as f:
                json.dump(self.categories, f, indent=2, ensure_ascii=False)
            logger.info("Categories saved to arvore_categorias.json")
        except Exception as e:
            logger.error(f"Error saving categories: {str(e)}")

    def _save_products(self):
        """Save products to products.json with proper formatting."""
        try:
            with open(self.products_file, 'w', encoding='utf-8') as f:
                json.dump(self.products, f, indent=2, ensure_ascii=False)
            logger.info("Products saved to products.json")
        except Exception as e:
            logger.error(f"Error saving products: {str(e)}")

    def _save_brands(self):
        """Save brands to marcas.json with proper formatting."""
        try:
            with open(self.brands_file, 'w', encoding='utf-8') as f:
                json.dump(self.brands, f, indent=2, ensure_ascii=False)
            logger.info("Brands saved to marcas.json")
        except Exception as e:
            logger.error(f"Error saving brands: {str(e)}")

    def _find_or_create_category(self, category_path: list) -> None:
        current = self.categories["categorias"]
        current_path = []
        
        for level in category_path:
            current_path.append(level)
            
            # Find existing category at this level
            existing = next(
                (cat for cat in current if cat["nombre"].lower() == level.lower()),
                None
            )
            
            if not existing:
                # Create new category
                new_id = str(len(current) + 1)
                if len(current_path) > 1:
                    parent_nums = [str(i+1) for i in range(len(current_path))]
                    new_id = ".".join(parent_nums)
                
                existing = {
                    "id": new_id,
                    "nombre": level,
                    "descripcion": f"Categoría de {level}",
                    "subcategorias": []
                }
                current.append(existing)
                logger.info(f"Created new category: {' > '.join(current_path)}")
            
            current = existing["subcategorias"]

    def _extract_brand_prompt(self, product: dict) -> str:
        """Create a prompt for extracting the brand from a product."""
        return f"""Analiza este producto y extrae la marca real según estas reglas:

REGLAS:
1. Ignora prefijos como "PRODUCTO ECONÓMICO" o descriptores similares
2. Si el producto es de marca blanca de Alcampo, la marca es "Alcampo"
3. Devuelve SOLO un JSON con el formato exacto mostrado abajo
4. La marca debe ser el nombre oficial de la empresa/marca

FORMATO DE RESPUESTA (EXACTO):
{{
    "marca": "nombre_de_la_marca"
}}

PRODUCTO:
{json.dumps(product, ensure_ascii=False)}

IMPORTANTE: DEVUELVE SOLO EL JSON CON LA MARCA REAL"""

    def _normalize_brand(self, brand: str) -> str:
        """Normalize brand names to ensure consistency."""
        # Convert to uppercase for comparison
        brand = brand.upper()
        
        # Common brand name corrections
        corrections = {
            "NESTLE": "NESTLÉ",
            "NESLTÉ": "NESTLÉ",
            "ALCAMPO BABY": "ALCAMPO",
            "ALCAMPO BABY ECOLÓGICO": "ALCAMPO",
            "PRODUCTO ECONÓMICO ALCAMPO": "ALCAMPO",
            "YOGOLINO DE NESTLÉ": "NESTLÉ",
            "NATIVA DE NESTLÉ": "NESTLÉ",
            "AUCHAN": "ALCAMPO"  # Auchan is Alcampo's parent company
        }
        
        # Apply corrections
        for wrong, correct in corrections.items():
            if brand == wrong or brand.startswith(wrong + " "):
                return correct
        
        # Special case for Alcampo products
        if "ALCAMPO" in brand:
            return "ALCAMPO"
        
        return brand

    def _extract_brand(self, product: dict) -> str:
        """Extract the real brand from a product."""
        try:
            # First try to extract from the product name
            name = product.get("name", "").upper()
            
            # Common brand prefixes to remove
            prefixes = [
                "PRODUCTO ECONÓMICO",
                "ECOLÓGICO",
                "BABY"
            ]
            
            # Remove prefixes
            for prefix in prefixes:
                if name.startswith(prefix):
                    name = name[len(prefix):].strip()
            
            # Extract the first word (usually the brand)
            brand = name.split()[0]
            
            # Try LLM if the extracted brand seems wrong
            if len(brand) < 2 or brand in ["EL", "LA", "LOS", "LAS"]:
                prompt = self._extract_brand_prompt(product)
                response = self.llm.invoke(prompt)
                brand_info = self._parse_brand_response(response)
                
                if brand_info and "marca" in brand_info:
                    brand = brand_info["marca"].strip()
            
            # Normalize the brand name
            brand = self._normalize_brand(brand)
            
            # Add to brands list if not exists
            if brand not in [b["nombre"] for b in self.brands["marcas"]]:
                self.brands["marcas"].append({
                    "nombre": brand,
                    "descripcion": f"Marca: {brand}"
                })
                self._save_brands()
                logger.info(f"Added new brand: {brand}")
            
            return brand
            
        except Exception as e:
            logger.error(f"Error extracting brand: {str(e)}")
            return product.get("brand", "")

    def _parse_brand_response(self, response: str) -> dict:
        """Parse the LLM response for brand extraction."""
        try:
            response = response.strip()
            
            # Clean up the response
            if response.startswith('```') and response.endswith('```'):
                response = response[3:-3].strip()
            elif response.startswith('```'):
                response = response[3:].strip()
            elif response.endswith('```'):
                response = response[:-3].strip()
            
            if response.startswith('json'):
                response = response[4:].strip()
            
            # Parse JSON
            result = json.loads(response)
            if not isinstance(result.get("marca"), str):
                raise ValueError("Invalid brand in response")
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing brand response: {str(e)}")
            return None

    def _create_category_prompt(self, product: dict) -> str:
        """Create a prompt for the LLM to categorize a product."""
        # Extract original data for more details
        original_data = product.get("metadata", {}).get("original_data", {}).get("original_data", {})
        
        # Get the most detailed information available
        name = product.get("name", "")
        brand = product.get("brand", "")
        description = product.get("description", "")
        price = product.get("price", {}).get("current", 0) if isinstance(product.get("price"), dict) else product.get("price", 0)
        store = product.get("store", "")
        unit = original_data.get("price_per_unit", "")
        url = original_data.get("url", "")
        image = original_data.get("image_url", "")
        
        return f"""Por favor, analiza el siguiente producto y devuelve una categorización jerárquica en formato JSON.
        
Producto: {name}
Marca: {brand}
Descripción: {description}
Precio: {price}
Unidad: {unit}
Tienda: {store}
URL: {url}
Imagen: {image}

Reglas:
1. Crea una jerarquía de categorías relevante y específica para este producto
2. Usa máximo 3 niveles de profundidad
3. Todas las categorías deben estar en español
4. La respuesta debe ser un objeto JSON con esta estructura:

{{
    "category_path": ["Categoría 1", "Subcategoría", "Sub-subcategoría"],
    "processed_product": {{
        "nombre": "{name}",
        "marca": "{brand}",
        "precio": {price},
        "descripcion": "{description}",
        "unidad": "{unit}",
        "tienda": "{store}",
        "url": "{url}",
        "imagen": "{image}"
    }}
}}

Responde SOLO con el JSON, sin texto adicional."""

    def _parse_category_response(self, response: str) -> dict:
        """Parse and validate the LLM's response."""
        try:
            # Extract JSON from response (in case there's additional text)
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].strip()
            
            data = json.loads(json_str)
            
            # Validate structure
            if not isinstance(data, dict):
                logger.error("Response is not a dictionary")
                return None
                
            if "category_path" not in data or "processed_product" not in data:
                logger.error("Missing required keys in response")
                return None
                
            if not isinstance(data["category_path"], list):
                logger.error("category_path is not a list")
                return None
                
            if not isinstance(data["processed_product"], dict):
                logger.error("processed_product is not a dictionary")
                return None
            
            # Validate required fields in processed_product
            required_fields = ["nombre", "marca", "precio", "descripcion", "tienda"]
            for field in required_fields:
                if field not in data["processed_product"]:
                    logger.error(f"Missing required field: {field}")
                    return None
            
            # Ensure precio is numeric
            try:
                data["processed_product"]["precio"] = float(data["processed_product"]["precio"])
            except (ValueError, TypeError):
                logger.error("Price is not numeric")
                return None
            
            # Set default values for optional fields
            data["processed_product"].setdefault("unidad", "")
            data["processed_product"].setdefault("url", "")
            data["processed_product"].setdefault("imagen", "")
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error parsing category response: {str(e)}")
            return None

    def _is_duplicate_product(self, product: dict) -> bool:
        """Check if a product already exists based on name, brand, and store."""
        normalized_name = product["nombre"].lower().strip()
        normalized_brand = self._normalize_brand(product["marca"]).lower()
        normalized_store = product["tienda"].lower().strip()
        normalized_url = product.get("url", "").lower().strip()  # Consider URL in duplicate check
        
        for existing in self.products["products"]:
            existing_name = existing["nombre"].lower().strip()
            existing_brand = self._normalize_brand(existing["marca"]).lower()
            existing_store = existing["tienda"].lower().strip()
            existing_url = existing.get("url", "").lower().strip()
            
            # Check for duplicates based on name, brand, and store
            if (normalized_name == existing_name and 
                normalized_brand == existing_brand and 
                normalized_store == existing_store):
                logger.info(f"Duplicate found: {product['nombre']} ({normalized_brand}) from {normalized_store}")
                return True
            
            # If URLs are present and match, consider it a duplicate
            if normalized_url and existing_url and normalized_url == existing_url:
                logger.info(f"Duplicate found by URL: {product['nombre']}")
                return True
            
            # Special case for Alcampo products - check if it's the same product with different branding
            if (normalized_brand == "alcampo" and existing_brand == "alcampo" and
                normalized_store == existing_store and
                self._similar_names(normalized_name, existing_name)):
                logger.info(f"Duplicate Alcampo product found: {product['nombre']}")
                return True
        
        return False

    def _similar_names(self, name1: str, name2: str) -> bool:
        """Check if two product names are similar (for Alcampo products)."""
        # Remove common prefixes and suffixes
        prefixes = ["producto economico", "ecologico", "baby", "alcampo"]
        
        for prefix in prefixes:
            if name1.startswith(prefix):
                name1 = name1[len(prefix):].strip()
            if name2.startswith(prefix):
                name2 = name2[len(prefix):].strip()
        
        # Compare the core product names
        return name1 == name2

    def process_file(self, file_path: str) -> dict:
        """Process a single file and categorize its products."""
        try:
            logger.info(f"Processing file: {file_path}")
            
            # Read input file
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Verify file structure
            if not isinstance(data, dict) or "products" not in data:
                raise ValueError("Input file must contain a 'products' dictionary")
            
            products_data = data["products"]
            total_products = len(products_data)
            logger.info(f"Found {total_products} products in file")
            
            processed = 0
            skipped = 0
            errors = 0
            
            # Process products in batches to avoid memory issues
            batch_size = 100
            products_processed = 0
            
            for product_id, product_data in products_data.items():
                try:
                    logger.info(f"\nProcessing product {products_processed + 1}/{total_products}")
                    logger.info(f"Product: {product_data.get('name', 'Unknown')}")
                    
                    # Extract original data
                    original_data = product_data.get("metadata", {}).get("original_data", {}).get("original_data", {})
                    
                    # Add all necessary data to the product
                    product_data["id"] = product_id
                    product_data["price"] = product_data.get("price", {}).get("current", 0) if isinstance(product_data.get("price"), dict) else product_data.get("price", 0)
                    product_data["unit"] = original_data.get("price_per_unit", "")
                    product_data["url"] = original_data.get("url", "")
                    product_data["image"] = original_data.get("image_url", "")
                    
                    # First, extract and verify the brand
                    real_brand = self._extract_brand(product_data)
                    product_data["brand"] = real_brand
                    
                    # Create category prompt
                    prompt = self._create_category_prompt(product_data)
                    
                    # Get category prediction
                    response = self.llm.invoke(prompt)
                    category_info = self._parse_category_response(response)
                    
                    if category_info:
                        # Check if product is already in database
                        if self._is_duplicate_product(category_info["processed_product"]):
                            skipped += 1
                            logger.info(f"→ Skipped (duplicate): {category_info['processed_product']['nombre']}")
                        else:
                            # Update categories in arvore_categorias.json
                            self._find_or_create_category(category_info["category_path"])
                            self._save_categories()
                            
                            # Add product to products.json
                            self.products["products"].append(category_info["processed_product"])
                            self._save_products()
                            processed += 1
                            logger.info(f"✓ Added: {category_info['processed_product']['nombre']} (Brand: {real_brand})")
                            logger.info(f"  URL: {category_info['processed_product']['url']}")
                            logger.info(f"  Image: {category_info['processed_product']['imagen']}")
                    else:
                        errors += 1
                        logger.error(f"✗ Failed to process product: Invalid category info")
                    
                    products_processed += 1
                    
                    # Save progress periodically
                    if products_processed % batch_size == 0:
                        logger.info(f"\nProgress Update:")
                        logger.info(f"Processed: {processed}")
                        logger.info(f"Skipped: {skipped}")
                        logger.info(f"Errors: {errors}")
                        logger.info(f"Total Progress: {products_processed}/{total_products}")
                        logger.info("="*50)
                        
                except Exception as e:
                    errors += 1
                    logger.error(f"Error processing product: {str(e)}")
                    products_processed += 1
                    continue
            
            # Final summary
            summary = {
                "total": total_products,
                "processed": processed,
                "skipped": skipped,
                "errors": errors,
                "success": True
            }
            
            logger.info("\nProcessing Complete:")
            logger.info(f"✓ Processed: {processed}")
            logger.info(f"→ Skipped: {skipped}")
            logger.info(f"✗ Errors: {errors}")
            
            return summary
            
        except Exception as e:
            error_msg = f"Error processing file: {str(e)}"
            logger.error(error_msg)
            return {
                "total": 0,
                "processed": 0,
                "skipped": 0,
                "errors": 1,
                "success": False,
                "error": error_msg
            }

def process_selected_file(file_path: str) -> dict:
    """Process a selected file and return the results."""
    try:
        processor = FileProcessor()
        return processor.process_file(file_path)
    except Exception as e:
        error_msg = f"Failed to initialize processor: {str(e)}"
        logger.error(error_msg)
        return {
            "total": 0,
            "processed": 0,
            "skipped": 0,
            "errors": 1,
            "success": False,
            "error": error_msg
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fileprocessing.py <file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
        
    result = process_selected_file(file_path)
    print(json.dumps(result, indent=2)) 