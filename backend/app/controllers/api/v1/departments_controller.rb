module Api
  module V1
    class DepartmentsController < ApplicationController
      before_action :set_department, only: [:show, :update]
      before_action :require_director!, only: [:create, :update]

      # GET /api/v1/departments
      def index
        departments = Department.includes(:manager).all
        render json: departments.map { |d| department_json(d) }, status: :ok
      end

      # GET /api/v1/departments/:id
      def show
        render json: department_json(@department), status: :ok
      end

      # POST /api/v1/departments
      def create
        department = Department.new(department_params)
        if department.save
          render json: department_json(department), status: :created
        else
          render json: { errors: department.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/departments/:id
      def update
        if @department.update(department_params)
          render json: department_json(@department), status: :ok
        else
          render json: { errors: @department.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_department
        @department = Department.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Department not found" }, status: :not_found
      end

      def department_params
        params.require(:department).permit(:name, :manager_id)
      end

      def department_json(department)
        {
          id: department.id,
          name: department.name,
          manager_id: department.manager_id,
          manager_name: department.manager&.name
        }
      end
    end
  end
end
