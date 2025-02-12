import Category from '../models/Category.js'
const categoryController = {
    // Render category management page
    getCategories: async (req, res) => {
        try {
            const categories = await Category.find({}).sort({ createdAt: -1 });
            res.render('admin/category', { categories });
        } catch (error) {
            res.status(500).redirect('/admin/category?error=' + encodeURIComponent('Failed to fetch categories'));
        }
    },

    // Add new category
    addCategory: async (req, res) => {
        try {
            const { categoryName, categoryDescription } = req.body;
            
            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).send('Category name and description are required');
            }

            // Check if category already exists
            const existingCategory = await Category.findOne({ name: categoryName });
            if (existingCategory) {
                return res.status(400).send('Category already exists');
            }

            // Create new category
            const newCategory = new Category({
                name: categoryName,
                description: categoryDescription,
                isActive: true
            });

            await newCategory.save();
            res.status(200).send('Category added successfully');
        } catch (error) {
            res.status(500).send('Failed to add category');
        }
    },

    // Edit category
    editCategory: async (req, res) => {
        try {
            const { categoryId, categoryName, categoryDescription } = req.body;

            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).send('Category name and description are required');
            }

            const updatedCategory = await Category.findByIdAndUpdate(
                categoryId,
                {
                    name: categoryName,
                    description: categoryDescription
                },
                { new: true }
            );

            if (!updatedCategory) {
                return res.status(404).send('Category not found');
            }

            res.status(200).send('Category updated successfully');
        } catch (error) {
            res.status(500).send('Failed to update category');
        }
    },

    // Toggle category status
    toggleCategory: async (req, res) => {
        try {
            const { id } = req.query;
            const category = await Category.findById(id);
            
            if (!category) {
                return res.status(404).send('Category not found');
            }

            category.isActive = !category.isActive;
            await category.save();

            res.status(200).send('Category status updated successfully');
        } catch (error) {
            res.status(500).send('Failed to toggle category status');
        }
    }
};

export { categoryController };

