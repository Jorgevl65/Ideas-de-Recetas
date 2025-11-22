import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client'; // Necesario para mostrar la app
import { ChefHat, Plus, X, Search, BookOpen, ShoppingBag, CheckCircle, AlertCircle, ArrowLeft, Camera, Image as ImageIcon, Bold, List } from 'lucide-react';

// --- Datos Iniciales Mejorados ---
const INITIAL_RECIPES = [
  {
    id: 1,
    name: 'Tortilla de Papas',
    ingredients: [
      { name: 'huevo', qty: '4 unidades' },
      { name: 'papa', qty: '3 grandes' },
      { name: 'cebolla', qty: '1 media' },
      { name: 'aceite', qty: 'Abundante' }
    ],
    instructions: '**Paso 1:** Pelar y cortar las papas en láminas finas.\n- Freír en abundante aceite caliente.\n- Añadir la cebolla picada a mitad de cocción.\n\n**Paso 2:** Batir los huevos y mezclar con las papas escurridas.\n**Paso 3:** Cuajar en la sartén vuelta y vuelta.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
    category: 'Cena'
  },
  {
    id: 2,
    name: 'Ensalada Caprese',
    ingredients: [
      { name: 'tomate', qty: '2 maduros' },
      { name: 'queso', qty: '200g mozzarella' },
      { name: 'albahaca', qty: 'Hojas frescas' },
      { name: 'aceite', qty: 'Al gusto' }
    ],
    instructions: '- Lavar bien los tomates.\n- Cortar el tomate y la mozzarella en rodajas del mismo grosor.\n- Alternar una rodaja de tomate, una de queso y una hoja de albahaca.\n**Final:** Rociar con aceite de oliva virgen extra.',
    image: 'https://images.unsplash.com/photo-1529312266912-b33cf6227e24?auto=format&fit=crop&w=800&q=80',
    category: 'Ligero'
  },
  {
    id: 3,
    name: 'Panqueques',
    ingredients: [
      { name: 'harina', qty: '1 taza' },
      { name: 'leche', qty: '1 taza' },
      { name: 'huevo', qty: '1 unidad' },
      { name: 'azucar', qty: '1 cda' }
    ],
    instructions: '**Mezcla:**\n- Juntar todos los ingredientes en la licuadora.\n- Licuar hasta que no queden grumos.\n\n**Cocción:**\n- Calentar sartén con un poco de manteca.\n- Verter mezcla y cocinar vuelta y vuelta.',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
    category: 'Postre'
  }
];

// --- Componente para renderizar texto con formato básico ---
const RichTextRenderer = ({ text }) => {
  return (
    <div className="space-y-2 text-[#A9A9A9] text-sm leading-relaxed font-medium">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        
        // Renderizar viñetas
        if (line.trim().startsWith('-')) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-[#5F249F] font-bold">•</span>
              <span className="text-gray-600" dangerouslySetInnerHTML={{ 
                __html: line.substring(1).replace(/\*\*(.*?)\*\*/g, '<strong style="color: black;">$1</strong>') 
              }} />
            </div>
          );
        }

        // Renderizar texto normal con negritas
        return (
          <p key={i} className="text-gray-600" dangerouslySetInnerHTML={{ 
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: black;">$1</strong>') 
          }} />
        );
      })}
    </div>
  );
};

// Quitamos el 'default' para usarlo internamente abajo
function App() {
  // --- Estados ---
  const [activeTab, setActiveTab] = useState('recipes'); // pantry, recipes, add
  const [selectedRecipe, setSelectedRecipe] = useState(null); // Para ver detalle
  const [searchQuery, setSearchQuery] = useState(''); // Buscador

  // Datos Persistentes
  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('chefPantryV3'); // V3 para nueva versión
    return saved ? JSON.parse(saved) : ['huevo', 'aceite', 'sal'];
  });
  
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem('chefRecipesV3');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  // Inputs Temporales
  const [ingredientInput, setIngredientInput] = useState('');
  const [newRecipe, setNewRecipe] = useState({ 
    name: '', 
    ingredients: [], 
    currentIngName: '',
    currentIngQty: '', 
    instructions: '',
    image: null
  });

  // Referencia para input de archivo
  const fileInputRef = useRef(null);

  // --- Efectos ---
  useEffect(() => { localStorage.setItem('chefPantryV3', JSON.stringify(pantry)); }, [pantry]);
  useEffect(() => { localStorage.setItem('chefRecipesV3', JSON.stringify(recipes)); }, [recipes]);

  // --- Lógica Auxiliar ---
  const normalize = (text) => text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

  // --- Lógica Despensa ---
  const addPantryItem = (e) => {
    e.preventDefault();
    if (!ingredientInput.trim()) return;
    const cleanItem = normalize(ingredientInput);
    if (!pantry.includes(cleanItem)) setPantry([...pantry, cleanItem]);
    setIngredientInput('');
  };

  const removePantryItem = (item) => setPantry(pantry.filter(i => i !== item));

  // --- Lógica Recetas ---
  const getRecipeStatus = (recipe) => {
    const missing = recipe.ingredients.filter(reqIng => 
      !pantry.some(userIng => normalize(userIng) === normalize(reqIng.name))
    );
    return {
      missing, 
      matchPercentage: ((recipe.ingredients.length - missing.length) / recipe.ingredients.length) * 100,
      canCook: missing.length === 0
    };
  };

  // Filtrar y Ordenar
  const filteredRecipes = recipes
    .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(r => ({...r, status: getRecipeStatus(r)}))
    .sort((a, b) => {
      if (a.status.canCook && !b.status.canCook) return -1;
      if (!a.status.canCook && b.status.canCook) return 1;
      return b.status.matchPercentage - a.status.matchPercentage;
    });

  // --- Lógica Agregar Receta ---
  const handleAddIngredientToRecipe = () => {
    if (!newRecipe.currentIngName.trim()) return;
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { 
        name: normalize(newRecipe.currentIngName), 
        qty: newRecipe.currentIngQty || 'Al gusto'
      }],
      currentIngName: '',
      currentIngQty: ''
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewRecipe({ ...newRecipe, image: url });
    }
  };

  const insertFormat = (tag) => {
    const textArea = document.getElementById('instructions-area');
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = newRecipe.instructions;
    const insertion = tag === 'bold' ? '**texto**' : '\n- ';
    const newText = text.substring(0, start) + insertion + text.substring(end);
    setNewRecipe({ ...newRecipe, instructions: newText });
  };

  const saveNewRecipe = () => {
    if (!newRecipe.name || newRecipe.ingredients.length === 0) return;
    const recipe = {
      id: Date.now(),
      name: newRecipe.name,
      ingredients: newRecipe.ingredients,
      instructions: newRecipe.instructions,
      image: newRecipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      category: 'Personal'
    };
    setRecipes([...recipes, recipe]);
    setNewRecipe({ name: '', ingredients: [], currentIngName: '', currentIngQty: '', instructions: '', image: null });
    setActiveTab('recipes');
  };

  // --- Renderizado Detalle de Receta (Modal) ---
  if (selectedRecipe) {
    const status = getRecipeStatus(selectedRecipe);
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Imagen Header */}
        <div className="relative h-64 w-full bg-gray-100">
          <img 
            src={selectedRecipe.image} 
            alt={selectedRecipe.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#5F249F]/60 to-transparent"></div>
          <button 
            onClick={() => setSelectedRecipe(null)}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all shadow-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido Detalle */}
        <div className="flex-1 overflow-y-auto p-6 -mt-6 bg-white rounded-t-3xl relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-black leading-tight">{selectedRecipe.name}</h2>
            {status.canCook ? (
              <span className="bg-[#5F249F] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                <CheckCircle className="w-3 h-3" /> LISTO
              </span>
            ) : (
              <span className="bg-[#A9A9A9]/20 text-[#A9A9A9] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                Faltan {status.missing.length}
              </span>
            )}
          </div>

          {/* Sección Ingredientes */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3 border-b border-gray-100 pb-2 text-[#5F249F]">Ingredientes</h3>
            <ul className="space-y-3">
              {selectedRecipe.ingredients.map((ing, i) => {
                const hasIt = pantry.some(p => normalize(p) === normalize(ing.name));
                return (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <span className={`capitalize flex items-center gap-2 ${hasIt ? 'text-black font-medium' : 'text-[#A9A9A9] line-through decoration-red-400'}`}>
                      {hasIt ? <CheckCircle className="w-4 h-4 text-[#5F249F]" /> : <AlertCircle className="w-4 h-4 text-[#A9A9A9]" />}
                      {ing.name}
                    </span>
                    <span className="text-[#A9A9A9] font-mono text-xs font-medium">{ing.qty}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sección Preparación */}
          <div>
            <h3 className="font-bold text-lg mb-3 border-b border-gray-100 pb-2 text-[#5F249F]">Preparación</h3>
            <RichTextRenderer text={selectedRecipe.instructions} />
          </div>
          
          <div className="h-10"></div>
        </div>
      </div>
    );
  }

  // --- Renderizado Principal ---
  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col md:max-w-md md:mx-auto md:shadow-2xl md:min-h-screen overflow-hidden">
      
      {/* Header Personalizado */}
      <header className="bg-[#5F249F] text-white pt-8 pb-6 px-6 rounded-b-[2rem] shadow-xl relative z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ChefHat className="w-8 h-8" />
              Ideas para Cocinar
            </h1>
          </div>
        </div>
        
        {/* Buscador Integrado */}
        {activeTab === 'recipes' && (
          <div className="relative mt-2 animate-in fade-in slide-in-from-top-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-white/70" />
            <input 
              type="text" 
              placeholder="Buscar receta..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 text-sm rounded-xl py-2.5 pl-9 pr-4 outline-none focus:bg-white/20 transition-all"
            />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        
        {/* --- VISTA: RECETAS --- */}
        {activeTab === 'recipes' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-10 text-[#A9A9A9]">
                <p>No encontramos recetas con ese nombre.</p>
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  onClick={() => setSelectedRecipe(recipe)}
                  className="bg-white group cursor-pointer"
                >
                  <div className="relative h-44 rounded-2xl overflow-hidden mb-3 shadow-md border border-gray-100">
                    <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    
                    {/* Badge de estado */}
                    <div className="absolute top-3 right-3">
                      {recipe.status.canCook ? (
                        <span className="bg-white/95 backdrop-blur text-[#5F249F] text-[10px] font-extrabold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> LISTO
                        </span>
                      ) : (
                        <span className="bg-[#5F249F] backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                          FALTA {recipe.status.missing.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#5F249F]/90 to-transparent">
                       <h4 className="font-bold text-white text-lg tracking-wide">{recipe.name}</h4>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- VISTA: DESPENSA --- */}
        {activeTab === 'pantry' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-6 relative">
              <form onSubmit={addPantryItem} className="flex gap-2">
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  placeholder="Agregar ingrediente..."
                  className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#5F249F] transition-all text-sm font-medium text-black placeholder-[#A9A9A9]"
                />
                <button type="submit" className="bg-[#5F249F] text-white px-4 rounded-xl hover:bg-[#4a1c7a] active:scale-95 transition-all shadow-md">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {pantry.length === 0 && (
                <p className="w-full text-center text-[#A9A9A9] py-8 text-sm">Tu nevera está vacía.</p>
              )}
              {pantry.map((item, idx) => (
                <span key={idx} className="bg-white border border-gray-200 text-black px-4 py-2 rounded-full flex items-center gap-2 shadow-sm animate-in zoom-in duration-200 text-sm font-medium">
                  <span className="capitalize">{item}</span>
                  <button onClick={() => removePantryItem(item)} className="text-[#A9A9A9] hover:text-[#5F249F] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* --- VISTA: AGREGAR RECETA --- */}
        {activeTab === 'add' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
            <h3 className="font-bold text-xl mb-6 text-[#5F249F]">Crear Receta</h3>
            
            <div className="space-y-5">
              {/* Cargar Foto */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-40 w-full bg-gray-50 border-2 border-dashed border-[#A9A9A9]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden group"
              >
                {newRecipe.image ? (
                  <img src={newRecipe.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-[#A9A9A9] mb-2 group-hover:text-[#5F249F] transition-colors" />
                    <span className="text-xs text-[#A9A9A9] font-medium group-hover:text-[#5F249F]">Toca para añadir foto</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="text-xs font-bold text-[#A9A9A9] uppercase tracking-wider">Nombre</label>
                <input 
                  type="text" 
                  className="w-full mt-1 bg-white border-b-2 border-gray-100 p-2 outline-none focus:border-[#5F249F] transition-all font-medium text-lg placeholder-gray-300"
                  placeholder="Ej: Pasta Alfredo"
                  value={newRecipe.name}
                  onChange={e => setNewRecipe({...newRecipe, name: e.target.value})}
                />
              </div>

              {/* Ingredientes + Cantidades */}
              <div>
                <label className="text-xs font-bold text-[#A9A9A9] uppercase tracking-wider mb-2 block">Ingredientes</label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    className="flex-[2] bg-gray-50 rounded-lg p-2 text-sm outline-none border border-transparent focus:border-[#5F249F]"
                    placeholder="Ingrediente (ej: Huevo)"
                    value={newRecipe.currentIngName}
                    onChange={e => setNewRecipe({...newRecipe, currentIngName: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="flex-1 bg-gray-50 rounded-lg p-2 text-sm outline-none border border-transparent focus:border-[#5F249F]"
                    placeholder="Cant. (ej: 2)"
                    value={newRecipe.currentIngQty}
                    onChange={e => setNewRecipe({...newRecipe, currentIngQty: e.target.value})}
                  />
                  <button onClick={handleAddIngredientToRecipe} className="bg-[#5F249F] text-white p-2 rounded-lg shadow-md hover:bg-[#4a1c7a] transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-1">
                  {newRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="font-medium capitalize text-black">{ing.name}</span>
                      <span className="text-[#A9A9A9] text-xs font-mono">{ing.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instrucciones con Formato */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-[#A9A9A9] uppercase tracking-wider">Instrucciones</label>
                  <div className="flex gap-1">
                    <button onClick={() => insertFormat('bold')} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-[#5F249F]" title="Negrita">
                      <Bold className="w-3 h-3" />
                    </button>
                    <button onClick={() => insertFormat('list')} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-[#5F249F]" title="Lista">
                      <List className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <textarea 
                  id="instructions-area"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none border-2 border-transparent focus:border-[#5F249F] h-32 text-sm resize-none leading-relaxed"
                  placeholder="Escribe aquí... Usa los botones para formato."
                  value={newRecipe.instructions}
                  onChange={e => setNewRecipe({...newRecipe, instructions: e.target.value})}
                />
              </div>

              <button 
                onClick={saveNewRecipe}
                disabled={!newRecipe.name || newRecipe.ingredients.length === 0}
                className="w-full py-4 bg-[#5F249F] text-white rounded-xl font-bold hover:bg-[#4a1c7a] disabled:bg-[#A9A9A9] disabled:cursor-not-allowed transition-all shadow-lg"
              >
                Guardar Receta
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Bar con Púrpura */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-gray-100 p-2 pb-6 absolute bottom-0 w-full flex justify-around items-center z-40">
        <button 
          onClick={() => setActiveTab('pantry')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'pantry' ? 'text-[#5F249F] bg-[#5F249F]/10' : 'text-[#A9A9A9] hover:text-[#5F249F]'}`}
        >
          <ShoppingBag className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setActiveTab('recipes')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'recipes' ? 'text-[#5F249F] bg-[#5F249F]/10' : 'text-[#A9A9A9] hover:text-[#5F249F]'}`}
        >
          <BookOpen className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setActiveTab('add')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'add' ? 'text-[#5F249F] bg-[#5F249F]/10' : 'text-[#A9A9A9] hover:text-[#5F249F]'}`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </nav>

    </div>
  );
}

// --- Renderizado FINAL (IMPORTANTE: Esto conecta React con el HTML) ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);